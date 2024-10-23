const path = require('path');
const {User, Communities, User_communities, Events, Cards} = require('../sequelize/models');
const {Op} = require('sequelize');
const jwt = require('jsonwebtoken');
const { filterObjectsByDistance } = require('../utils/distanceUtils');
const { decrypt } = require('../utils/gostEncoder');

const createPath = (page) => path.resolve(__dirname, '../../public/templates/', `${page}.ejs`);

//main pages
exports.create_community = async (req, res) => {
    const userData = jwt.decode(req.cookies.accessToken);
    const { name, description } = req.body;

    try {
        const community = await Communities.create({ name, description });
    
        // Создаем запись о том, что создатель является админом
        await User_communities.create({
            userId: userData.user_id,
            communityId: community.id,
            role: 'admin'
        });
    
        res.status(201).json(community);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Не удалось создать сообщество' });
    }
};

exports.get_communities = async (req, res) => {
    try {
        const communities = await Communities.findAll();
        res.status(200).json(communities);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Не удалось получить сообщества' });
    }
};

exports.render_communities = async (req, res) => {
    try {
        const {user_id} = jwt.decode(req.cookies.accessToken);
        let user = await User.findByPk(user_id, {
            include: [{
                model: Communities,
                through: { attributes: [] },
                as: 'communities',
                include: [{
                    model: User,
                    through: User_communities,
                    as: 'members',
                    attributes: ['id', 'firstName', 'lastName', 'email']
                }]
            }]
        });
        if (user && user.communities && user.communities.length > 0) {

            if (user.communities[0].members && user.communities[0].members.length > 0) {
                // Decrypt member data
                user.communities[0].members.forEach(member => {
                    member.firstName = decrypt(member.firstName);
                    member.lastName = decrypt(member.lastName);
                    member.email = decrypt(member.email);
                });

                // Find and move the specified user_id to the front
                const index = user.communities[0].members.findIndex(member => member.id === user_id);
                if (index !== -1) {
                    const [member] = user.communities[0].members.splice(index, 1);
                    user.communities[0].members.unshift(member);
                    console.log(user.communities[0].members);
                }
            }
        }
        if(user.communities == 0) {
            const {req_distance} = req.body;
            const userCoordinates = user.adr_coordinates.split(',').map(Number);
            const communities = await Communities.findAll();
            const nearbyCommunities = filterObjectsByDistance(communities, userCoordinates, req_distance);
            return res.status(200).json({new_communities: nearbyCommunities});
        }
        return res.status(200).json({my_community: user.communities[0]})
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Не удалось получить сообщества' });
    }
};

exports.join_community = async (req, res) => {
    const { communityId } = req.params;
    const userData = jwt.decode(req.cookies.accessToken);

    try {
        const community = await Communities.findByPk(communityId);
        if (!community) {
            return res.status(404).json({ error: 'Сообщество не найдено' });
        }
    
        // Проверяем, состоит ли пользователь уже в сообществе
        const existingMembership = await User_communities.findOne({
            where: { userId: userData.user_id }
        });
    
        if (existingMembership) {
            return res.status(400).json({ error: 'Вы уже состоите в сообществе' });
        }
    
        // Присоединяем пользователя к сообществу
        await User_communities.create({
            userId: userData.user_id,
            communityId,
            role: 'member'
        });
        res.status(200).json({ message: 'Вы успешно присоединились к сообществу' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Не удалось присоединиться к сообществу' });
    }
};

exports.update_role = async (req, res) => {
    const { communityId, userId } = req.params;
    const { role } = req.body; // "admin" или "member"
    const userData = jwt.decode(req.cookies.accessToken);
  
    // Проверяем, имеет ли текущий пользователь права администратора в этом сообществе
    try {
        const userCommunity = await User_communities.findOne({
            where: { userId: userData.user_id, communityId, role: 'admin' }
        });
    
        if (!userCommunity) {
            return res.status(403).json({ error: 'У вас недостаточно прав для изменения ролей' });
        }
    
        // Проверяем, что роль корректная
        if (!['admin', 'member'].includes(role)) {
            return res.status(400).json({ error: 'Неверная роль' });
        }
    
        // Обновляем роль пользователя
        const updatedUserCommunity = await User_communities.update(
            { role },
            { where: { userId, communityId } }
        );
    
        if (!updatedUserCommunity) {
            return res.status(404).json({ error: 'Пользователь не найден в этом сообществе' });
        }
    
        res.status(200).json({ message: 'Роль пользователя успешно обновлена' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Не удалось обновить роль пользователя' });
    }
};

exports.delete_user = async (req, res) => {
    const { communityId, userId } = req.params;
    const userData = jwt.decode(req.cookies.accessToken);

    try {
        // Проверяем, что текущий пользователь — администратор сообщества
        const adminCheck = await User_communities.findOne({
            where: { userId: userData.user_id, communityId, role: 'admin' }
        });
    
        if (!adminCheck) {
            return res.status(403).json({ error: 'У вас нет прав для удаления пользователей' });
        }
    
        // Удаляем пользователя из сообщества
        const deleteUserCommunity = await User_communities.destroy({
            where: { userId, communityId }
        });
    
        if (!deleteUserCommunity) {
            return res.status(404).json({ error: 'Пользователь не найден в этом сообществе' });
        }
    
        res.status(200).json({ message: 'Пользователь успешно удален из сообщества' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Не удалось удалить пользователя из сообщества' });
    }
}

exports.get_members = async (req, res) => {
    const { communityId } = req.body;

    try {
        const community = await Communities.findByPk(communityId, {
            include: [
            {
                model: User,
                as: 'members',
                attributes: ['id', 'firstName', 'lastName', 'email'],
                through: { attributes: ['role'] } // Получаем роль через промежуточную таблицу
            }
            ]
        });
        console.log(community);
        
        if (!community) {
            return res.status(404).json({ error: 'Сообщество не найдено' });
        }
    
        res.status(200).json(community.members);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Не удалось получить список пользователей сообщества' });
    }
};

exports.update_community = async (req, res) => {
    const { communityId } = req.params;
    const { name, description } = req.body;
    const userData = jwt.decode(req.cookies.accessToken);

    try {
        // Проверяем, что текущий пользователь — администратор сообщества
        const adminCheck = await User_communities.findOne({
            where: { userId: userData.user_id, communityId, role: 'admin' }
        });
    
        if (!adminCheck) {
            return res.status(403).json({ error: 'У вас нет прав для редактирования этого сообщества' });
        }
    
        // Обновляем информацию о сообществе
        const community = await Communities.update(
            { name, description },
            { where: { id: communityId } }
        );
    
        if (!community) {
            return res.status(404).json({ error: 'Сообщество не найдено' });
        }
    
        res.status(200).json({ message: 'Сообщество успешно обновлено' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Не удалось обновить сообщество' });
    }
}

exports.delete_community = async (req, res) => {
    const { communityId } = req.params;
    const userData = jwt.decode(req.cookies.accessToken);

    try {
        // Проверяем, что текущий пользователь — администратор сообщества
        const adminCheck = await User_communities.findOne({
            where: { userId: userData.user_id, communityId, role: 'admin' }
        });
    
        if (!adminCheck) {
            return res.status(403).json({ error: 'У вас нет прав для удаления этого сообщества' });
        }
    
        // Удаляем сообщество
        await Communities.destroy({ where: { id: communityId } });
    
        res.status(200).json({ message: 'Сообщество успешно удалено' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Не удалось удалить сообщество' });
    }
}

exports.get_create_event_form = async (req, res) => {
    try {
        const userData = jwt.decode(req.cookies.accessToken);
        
        const user_community = await User_communities.findOne({
            where: { userId: userData.user_id}
        });

        if(!user_community || user_community.role != 'admin') {
            return res.status(403);
        }

        const cards = await Cards.findAll({
            order: [['name', 'ASC']]
        });

        return res.json({cards}).status(200);
    } catch(e) {
        console.log(e);
        return res.status(500);
    }
}

exports.create_event = async (req, res) => {
    try {
        const userData = jwt.decode(req.cookies.accessToken);
        const {event_datetime, event_title, event_description, event_address, event_reward} = req.body;
        console.log(req.body)

        const user_community = await User_communities.findOne({
            where: {userId: userData.user_id}
        });
        console.log(user_community)
        if(!user_community || user_community.role != 'admin') {
            return res.status(403);
        }
        const community = await Communities.findByPk(user_community.communityId);
        const event = await Events.create({
            date: event_datetime,
            name: event_title,
            description: event_description,
            address: event_address,
            imgSrc: `/img/events/${req.file.filename}`,
            organization: community.name,
            reward_id: event_reward
        });
        return res.json({message: 'Success!!!'}).status(200);
    } catch(e) {
        console.log(e);
        return res.status(500);
    }

}

