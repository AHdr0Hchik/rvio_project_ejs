const path = require('path');
//const User = require('../classes/User');
//const MailService = require('../classes/MailService');
const bcrypt = require('bcryptjs');
const {User, Cards, users_cards, Events, Event_participants} = require('../sequelize/models');
const {Op, where} = require('sequelize');
const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');
const {syncUserCards} = require('../utils/syncUtils');

const createPath = (page) => path.resolve(__dirname, '../../public/templates/', `${page}.ejs`);

//main pages
exports.index = async (req, res) => { 
    try {
        const userData = jwt.decode(req.cookies.accessToken);
        let user = await User.findOne({ where: {id: userData.user_id} });
        let userCardsRaw = await users_cards.findAll({ where: {user_id: user.id} });

        // Синхронизируем карточки
        await syncUserCards(userCardsRaw, user);

        // Обновляем данные пользователя и карточек после синхронизации
        user = await User.findOne({ where: {id: userData.user_id} });
        userCardsRaw = await users_cards.findAll({ where: {user_id: user.id} });

        // Синхронизируем карточки
        await syncUserCards(userCardsRaw, user);

        // Обновляем данные пользователя и карточек после синхронизации
        user = await User.findOne({ where: {id: userData.user_id} });
        userCardsRaw = await users_cards.findAll({ where: {user_id: user.id} });

        // Извлекаем ID карточек, которые уже есть у пользователя
        const userCardIds = userCardsRaw.map(card => card.card_id);
        const userCards = await Cards.findAll({
            where: {
                id: {
                    [Op.in]: userCardIds
                }
            }
        });
        const mergedCards = userCardsRaw.map(userCardRaw => {
            const cardDetails = userCards.find(card => card.id === userCardRaw.card_id);
            return {
                ...userCardRaw.dataValues, // информация об уровне и опыте
                ...cardDetails.dataValues  // информация о самой карточке
            };
        });

        //Ищем все карточки, которых нет в массиве userCardIds
        const availableCards = await Cards.findAll({
            where: {
                id: {
                    [Op.notIn]: userCardIds // Исключаем карточки, которые уже есть у пользователя
                }
            }
        });


        /*const generateQRCode = async (cardId, level, expiryDate) => {
            try {
                const data = {
                    id: cardId,
                    levelIncrease: level,
                    expires: expiryDate.toISOString()
                };
                const jsonString = JSON.stringify(data);
                const qrCodeDataURL = await QRCode.toDataURL(jsonString);
                return qrCodeDataURL;
            } catch (err) {
                console.error(err);
            }
        };
        
        // Пример использования
        const cardId = '8';
        const level = '1';
        const expiryDate = new Date(); // Установите нужную дату истечения
        expiryDate.setDate(expiryDate.getDate() + 7); // Плюс 7 дней
        
        generateQRCode(cardId, level, expiryDate).then(qrCodeDataURL => {
            console.log(qrCodeDataURL); // Это будет Data URL для изображения QR-кода
        });*/


        return res.render(createPath('main'), {user, availableCards: availableCards, userCards: mergedCards});  
    } catch(e) {
        console.log(e);
    }
    
};

exports.scan = async (req, res) => {
    try {
        res.json({"message":"scanned!"});
        const userData = jwt.decode(req.cookies.accessToken);
        const qrData = JSON.parse(req.body.qrData);
        const card = await Cards.findByPk(qrData.id);
        const user_card = await users_cards.findOne({
            where: {
                user_id: userData.user_id,
                card_id: card.id
            }
        });
        if(!user_card) {
            await users_cards.create({
                user_id: userData.user_id,
                card_id: card.id,
                card_lvl: qrData.levelIncrease,
                card_exp: card.baseExp*parseInt(qrData.levelIncrease)
            });
        } else {
            await users_cards.update({
                card_lvl: parseInt(user_card.card_lvl) + parseInt(qrData.levelIncrease)
            },
            {
                where: {
                    user_id: userData.user_id,
                    card_id: card.id
                }
            })
        };
        let user = await User.findOne({ where: {id: userData.user_id} });
        let userCardsRaw = await users_cards.findAll({ where: {user_id: user.id} });

        // Синхронизируем карточки
        await syncUserCards(userCardsRaw, user);

        userCardsRaw = await users_cards.findAll({ where: {user_id: user.id} });

        // Синхронизируем карточки
        await syncUserCards(userCardsRaw, user);
    } catch(e) {
        console.log(e);
    } 
}

exports.claim_card = async (req, res) => {
    try {
        const userData = jwt.decode(req.cookies.accessToken);
        const {card_id} = req.body;
        const card = await Cards.findByPk(card_id);

        if(!card) {
            return res.status(500);
        }

        await users_cards.create({
            user_id: userData.user_id,
            card_id: card.id,
            card_level: 1,
            card_exp: card.baseExp
        });

        return res.json({"message": "Successful!"});
    } catch(e) {

    }
}

exports.get_events = async (req, res) => {
    try {

        const eventParticipants = await Event_participants.findAll({
            include: [{
              model: Events,
              as: 'event'
            }]
        });

        const eventIds = eventParticipants.map(ep => ep.event_id);

        // Получаем события, которые происходят в будущем, исключая те, что есть в eventParticipants
        const events = await Events.findAll({
            where: {
                date: { [Op.gt]: new Date() },
                id: { [Op.notIn]: eventIds } // Исключаем события, которые уже есть у участников
            }
        });
        
        const participatedEvents = eventParticipants.map(ep => ep.event);
        console.log(eventParticipants);
        return res.json({events: events, my_events: participatedEvents}).status(200);
    } catch(e) {
        console.log(e);
        return res.redirect('/');
    }
}

exports.get_reward = async (req, res) => {
    try {
        const { reward_id } = req.body;

        const reward = await Cards.findByPk(reward_id);

        return res.json(reward).status(200);
    } catch(e) {
        console.log(e);
        return res.json('Error').status(500);
    }
}

exports.to_participate = async (req, res) => {
    try {
        const userData = jwt.decode(req.cookies.accessToken);
        const { event_id } = req.body;
        const isParticipator = await Event_participants.findOne({
            where: {
                user_id: userData.user_id,
                event_id: event_id
            }
        });
        if(isParticipator) { 
            return res.json({'message' : 'Вы уже участвуете!'}).status(200);
        }
        Event_participants.create({
            user_id: userData.user_id,
            event_id: event_id
        }).then(() =>{
            return res.json({'message': 'Вы записаны на участие!'}).status(200);
        })
    } catch(e) {
        console.log(e);
        return res.json({'message' : 'Ошибка'}).status(500);
    }
}





