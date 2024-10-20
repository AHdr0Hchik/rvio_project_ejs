const path = require('path');
const {User, Communities, User_communities} = require('../sequelize/models');
const {Op} = require('sequelize');
const jwt = require('jsonwebtoken');

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
        const user = await User.findByPk(user_id, {
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
        if(user.communities == 0) {
            const communities = await Communities.findAll();
            return res.status(200).json({new_communities: communities});
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

