const { User, Cards, users_cards } = require('../sequelize/models'); // Импортируйте ваши модели


async function syncUserCards(usersCardsRaw, user) {
    const baseExpMap = await getBaseExpMap(); // Получаем baseExp для всех карточек
    // Шаг 1: Синхронизация card_exp на основе card_lvl
    for (const card of usersCardsRaw) {
        const baseExp = baseExpMap[card.card_id].baseExp; // Получаем baseExp по cardId
        const rarity = baseExpMap[card.card_id].rarity;
        if (baseExp) {
            // Вычисляем card_exp на основе card_lvl
            const cardExp = calculateCardExp(baseExp, card.card_lvl, rarity);
            // Обновляем card_exp в таблице users_cards
            await users_cards.update({
                card_exp: cardExp
            }, { where: { id: card.id } });
        }
    }

    // Шаг 2: Синхронизация totalExp и lvl для пользователя
    const totalCardExp = usersCardsRaw.reduce((sum, card) => sum + card.card_exp, 0);
    
    // Обновляем totalExp
    if (totalCardExp !== user.totalExp) {
        await User.update({
            totalExp: totalCardExp
        }, { where: { id: user.id } });
    }

    // Проверяем и обновляем lvl
    const calculatedUserLevel = calculateLevel(totalCardExp);
    if (calculatedUserLevel !== user.lvl) {
        await User.update({
            lvl: calculatedUserLevel
        }, { where: { id: user.id } });
    }
}

// Функция для получения baseExp
async function getBaseExpMap() {
    const cards = await Cards.findAll(); // Предполагается, что Cards - это ваша модель
    return cards.reduce((map, card) => {
        map[card.id] = {baseExp: card.baseExp, rarity: card.rarity}; // card.id соответствует cardId
        return map;
    }, {});
}

function calculateCardExp(base_exp, level, rarity) {
    let result = 0;
    if (level === 1) {
        return base_exp;
    } else if (level === 2) {
        return 2 * base_exp;
    } else {
        if(rarity === 'common') {
            const coef = 2;
            const log_base = 2;
            result = 2 * Math.max(base_exp, base_exp * Math.log(coef * (level - 1)) / Math.log(log_base));
        } else if(rarity === 'rare') {
            const increment = base_exp*3
            result = 2 * base_exp + (level - 2) * increment;
        } else if(rarity === 'legendary') {
            const power_base = 2;
            result = 2 * Math.max(base_exp, base_exp * Math.pow(power_base, level - 2));
        }
    }
    return result;
}

function calculateLevel(card_exp) {
    if (card_exp < 100) return 1; // Минимальный уровень
    const base = 3;
    const level = Math.log(card_exp / 100) / Math.log(base) + 2;
    return Math.floor(level); // Округляем вниз до ближайшего целого
}

module.exports = {
    syncUserCards
}