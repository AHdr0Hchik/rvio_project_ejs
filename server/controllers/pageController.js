const path = require('path');
//const User = require('../classes/User');
//const MailService = require('../classes/MailService');
const bcrypt = require('bcryptjs');
const {User, Cards} = require('../sequelize/models');
const jwt = require('jsonwebtoken');

const createPath = (page) => path.resolve(__dirname, '../../public/templates/', `${page}.ejs`);

//main pages
exports.index = async (req, res) => { 
    const userData = jwt.decode(req.cookies.accessToken);
    const user = await User.findOne({
        where: {id: userData.user_id}
    });
    const cards = await Cards.findAll();
    return res.render(createPath('main'), {user, cards: cards});  
};

exports.scan = async (req, res) => {
    console.log(req.body);
    return res.json({"message":"scanned!"})
}





