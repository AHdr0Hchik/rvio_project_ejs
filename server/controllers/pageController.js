const path = require('path');
//const User = require('../classes/User');
//const MailService = require('../classes/MailService');
const bcrypt = require('bcryptjs');
const {User, Cards, users_cards, Events, Event_participants, Tests, Questions, Answers, UserResults, Communities, User_communities} = require('../sequelize/models');
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
        user = await User.findByPk(userData.user_id, {
            include: [
              {
                model: Communities,
                as: 'communities',
                through: {
                  attributes: ['role'] // Include role from the join table if needed
                }
              }
            ]
        });
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

exports.get_user = async (req, res) => {
    try {
        const { user_id } = req.body;
        let user = await User.findByPk(user_id, {
            attributes: ['firstName', 'lastName', 'email', 'imgSrc', 'lvl'],
            include: [{
                model: users_cards,
                as: 'cards',
                attributes: ['card_lvl', 'card_exp'],
                include: [{
                    model: Cards,
                    as: 'card',
                    attributes: ['id', 'name', 'shortDesc', 'fullDesc', 'rarity', 'imgSrc']
                }]
            }]
        });

        user.cards = user.cards.map(card => {
            const newCard = { ...card };
            delete newCard.card;
            return { ...newCard, ...card.card };
        });
        res.status(200).json(user)
    } catch(e) {
        console.log(e);
        res.status(500).json({message: 'error'});
    }
    
}

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

exports.get_cards = async (req, res) => {
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
    return res.json({my_cards: mergedCards, availableCards: availableCards}).status(200);
}

//tests

exports.create_test = async (req, res) => {
    /*
    {
        "title": "Тест по JavaScript",
        "description": "Основы JavaScript",
        "reward_id": 1
        "questions": [
            {
                "question_text": "Что такое замыкание?",
                "answers": [
                    { "answer_text": "Функция, которая возвращает другую функцию", "is_correct": false },
                    { "answer_text": "Функция, которая имеет доступ к переменным внешней функции", "is_correct": true },
                    { "answer_text": "Объект внутри функции", "is_correct": false }
                ]
            },
            {
                "question_text": "Что такое промис?",
                "answers": [
                    { "answer_text": "Функция, которая выполняется асинхронно", "is_correct": false },
                    { "answer_text": "Объект, представляющий результат асинхронной операции", "is_correct": true },
                    { "answer_text": "Массив с асинхронными значениями", "is_correct": false }
                ]
            }
        ]
    }
    */
    try {
        const { title, description, questions, reward_id } = req.body;
    
        const test = await Tests.create({ title, description, reward_id });
    
        for (const question of questions) {
            const createdQuestion = await Questions.create({
                question_text: question.question_text,
                test_id: test.id
            });
    
            for (const answer of question.answers) {
            await Answers.create({
                answer_text: answer.answer_text,
                is_correct: answer.is_correct,
                question_id: createdQuestion.id
            });
            }
        }
        res.status(201).json({ message: 'Тест успешно создан!', test });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Произошла ошибка при создании теста' });
    }
};

exports.get_test = async (req, res) => {
    try {
        const testId = req.body.test_id;

        // Получаем тест с вопросами и ответами
        const test = await Tests.findByPk(testId, {
            include: [
                {
                    model: Questions,
                    include: [Answers]
                }
            ]
        });
  
        if (!test) {
            return res.status(404).json({ message: 'Тест не найден' });
        }
    
        // Перемешиваем вопросы
        const shuffledQuestions = test.Questions.sort(() => Math.random() - 0.5);
    
        // Перемешиваем ответы и удаляем флаг is_correct
        shuffledQuestions.forEach(question => {
            question.Answers = question.Answers
            .sort(() => Math.random() - 0.5)
            .map(answer => ({
                id: answer.id,             // Отправляем только ID ответа
                answer_text: answer.answer_text // И текст ответа
            }));
        });
    
        res.status(200).json({
            id: test.id,
            title: test.title,
            description: test.description,
            questions: shuffledQuestions
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Произошла ошибка при загрузке теста' });
    }
};

exports.get_tests = async (req, res) => {
    try {
        const userData = jwt.decode(req.cookies.accessToken);

        // Get all test IDs the user has completed
        const completedResults = await UserResults.findAll({
            where: { user_id: userData.user_id, completed_at: { [Op.not]: null } },
            attributes: ['test_id']
        });

        const completedTestIds = completedResults.map(result => result.test_id);

        // Function to add question count to tests
        const addQuestionCount = async (tests) => {
            const testsWithCounts = await Promise.all(tests.map(async (test) => {
                const questionCount = await Questions.count({ where: { test_id: test.id } });
                return {
                    ...test.toJSON(),
                    questionCount
                };
            }));
            return testsWithCounts;
        };

        // Get completed tests with question counts
        const completedTests = await Tests.findAll({
            where: { id: completedTestIds }
        });
        const completedTestsWithCounts = await addQuestionCount(completedTests);

        // Get tests not completed by the user with question counts
        const notCompletedTests = await Tests.findAll({
            where: { id: { [Op.notIn]: completedTestIds } }
        });
        const notCompletedTestsWithCounts = await addQuestionCount(notCompletedTests);

        res.status(200).json({
            my_tasks: completedTestsWithCounts,
            new_tasks: notCompletedTestsWithCounts
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Произошла ошибка при загрузке тестов' });
    }
}

exports.submit_test = async (req, res) => {
    //body
    /*
    {
        "user_id": 1,
        "test_id": 1,
        "answers": [
            { "question_id": 1, "answer_id": 2 },
            { "question_id": 2, "answer_id": 5 }
        ]
    }
    */
    try {
        const { test_id, answers } = req.body;
        const userData = jwt.decode(req.cookies.accessToken);

        const userResult = await UserResults.findOne({
            where: {
                user_id: userData.user_id,
                test_id: test_id
            }
        });
        if(userResult) {
            res.status(201).json({ message: 'Тест нельзя пройти больше одного раза!'});
        }
        
        // Найдём все вопросы для данного теста
        const questions = await Questions.findAll({
            where: { test_id },
            include: [Answers]
        });
    
        let score = 0;
    
        // Подсчитываем правильные ответы в зависимости от типов вопросов
        for (const question of questions) {
            const userAnswer = answers.find(a => a.question_id === question.id);
        
            if (!userAnswer) continue;  // Пропускаем, если пользователь не ответил на вопрос
        
            // Обработка одиночного выбора
            if (question.type === 'single') {
                const correctAnswer = question.Answers.find(answer => answer.is_correct);
                if (userAnswer.answer_id === correctAnswer.id) {
                score++;
                }
            }
        
            // Обработка множественного выбора
            else if (question.type === 'multiple') {
                const correctAnswers = question.Answers.filter(answer => answer.is_correct).map(a => a.id);
                const userAnswers = userAnswer.answer_ids; // В этом случае пользователь отправляет массив answer_ids
        
                // Проверим, все ли правильные ответы выбраны
                if (correctAnswers.length === userAnswers.length && correctAnswers.every(id => userAnswers.includes(id))) {
                score++;
                }
            }
        
            // Обработка текстовых вопросов
            else if (question.type === 'text') {
                const correctAnswer = question.Answers.find(answer => answer.is_correct);
                if (correctAnswer.answer_text.trim().toLowerCase() === userAnswer.answer_text.trim().toLowerCase()) {
                score++;
                }
            }
        }

        if(score / questions.length >= 0.8) {
            const reward = await Tests.findByPk(test_id);
            const card = await users_cards.findOne({
                where: {
                    user_id: userData.user_id,
                    card_id: reward.reward_id
                }
            });
            if(card) {
                await users_cards.update({
                    card_lvl: parseInt(card.card_lvl)+1,
                    where: {
                        user_id: userData.user_id,
                        card_id: reward.reward_id
                    }
                });
            } else {
                await users_cards.create({
                    user_id: userData.user_id,
                    card_id: reward.reward_id,
                    card_lvl: 1
                });
            }
        }
    
        // Сохраняем результат пользователя
        await UserResults.create({
            user_id: userData.user_id,
            test_id,
            score,
            completed_at: new Date()
        });
    
        res.status(201).json({ message: 'Результаты сохранены', score });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Ошибка при отправке результатов' });
    }
}

exports.get_user_result = async (req, res) => {
    try {
        const userId = req.body.user_id;
    
        const results = await UserResults.findAll({
            where: { user_id: userId },
            include: [
                {
                model: Tests,
                attributes: ['title', 'description']
                }
            ]
        });
    
        if (results.length === 0) {
          return res.status(404).json({ message: 'Результаты не найдены' });
        }
    
        res.status(200).json(results);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Произошла ошибка при получении результатов' });
    }
}

exports.edit_test = async (req, res) => {

    //body
    /*
    {
        "title": "Обновлённый тест по JavaScript",
        "description": "Обновленное описание",
        "questions": [
            {
                "id": 1,
                "question_text": "Что такое замыкание?",
                "answers": [
                    {
                    "id": 1,
                    "answer_text": "Функция, которая возвращает другую функцию",
                    "is_correct": false
                    },
                    {
                    "id": 2,
                    "answer_text": "Функция, которая имеет доступ к переменным внешней функции",
                    "is_correct": true
                    }
                ]
            },
            {
                "id": 2,
                "question_text": "Что такое промис?",
                "answers": [
                    {
                    "id": 3,
                    "answer_text": "Функция, которая выполняется асинхронно",
                    "is_correct": false
                    },
                    {
                    "id": 4,
                    "answer_text": "Объект, представляющий результат асинхронной операции",
                    "is_correct": true
                    }
                ]
            }
        ]
    }
    */

    const { id } = req.params; // ID теста, который нужно изменить
    const { title, description, questions } = req.body;

    try {
        // Обновляем тест
        const test = await Tests.findByPk(id);
        if (!test) {
        return res.status(404).json({ message: 'Тест не найден' });
        }

        await test.update({ title, description });

        // Обновляем вопросы и ответы
        for (const question of questions) {
        let updatedQuestion = await Questions.findByPk(question.id);

        // Если вопрос существует, обновляем его
        if (updatedQuestion) {
            await updatedQuestion.update({ question_text: question.question_text });

            // Обновляем ответы для этого вопроса
            for (const answer of question.answers) {
            let updatedAnswer = await Answers.findByPk(answer.id);
            if (updatedAnswer) {
                await updatedAnswer.update({ answer_text: answer.answer_text, is_correct: answer.is_correct });
            } else {
                // Если ответ не найден, создаём новый
                await Answers.create({
                answer_text: answer.answer_text,
                is_correct: answer.is_correct,
                question_id: updatedQuestion.id
                });
            }
            }
        } else {
            // Если вопрос не найден, создаём новый
            const newQuestion = await Questions.create({
            question_text: question.question_text,
            test_id: id
            });

            // Добавляем ответы для нового вопроса
            for (const answer of question.answers) {
                await Answers.create({
                    answer_text: answer.answer_text,
                    is_correct: answer.is_correct,
                    question_id: newQuestion.id
                });
            }
        }
        }

        res.status(200).json({ message: 'Тест успешно обновлён', test });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Ошибка при обновлении теста' });
    }
}

exports.delete_test = async (req, res) => {
    const { id } = req.params;

    try {
        // Найдем тест по ID
        const test = await Tests.findByPk(id);
        if (!test) {
            return res.status(404).json({ message: 'Тест не найден' });
        }

        // Удалим все записи в userresults, связанные с тестом
        await UserResults.destroy({ where: { test_id: id } });

        // Удаляем все вопросы и соответствующие ответы, связанные с тестом
        const questions = await Questions.findAll({ where: { test_id: id } });

        for (const question of questions) {
            // Удалим все ответы, связанные с этим вопросом
            await Answers.destroy({ where: { question_id: question.id } });
        }

        // Удалим все вопросы
        await Questions.destroy({ where: { test_id: id } });

        // Удалим сам тест
        await test.destroy();

        res.status(200).json({ message: 'Тест успешно удалён' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Ошибка при удалении теста' });
    }
}

exports.start_test = async (req, res) => {
    const { user_id, test_id } = req.body;

    try { 
        // Начинаем тест, сохраняя время начала
        const userResult = await UserResults.create({
            user_id,
            test_id,
            score: 0, // Изначально пользователь имеет 0 баллов
            start_time: new Date() // Время начала теста
        });

        res.status(201).json({ message: 'Тест начат', userResult });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Ошибка при начале теста' });
    }
}



