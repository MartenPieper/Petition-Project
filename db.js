// Database name = "petitions", table name "petition"
const spicedPg = require("spiced-pg");
// const secrets = require("./secrets");
const db = spicedPg(
    process.env.DATABASE_URL ||
        "postgres:postgres:postgres@localhost:5432/petitions"
); // postgres:_USER_:_PASSWORD_ ,e.g. for taking the user in "secrets.json" ${secrets.dbUser}:${secrets.dbPass}

exports.createPetition = (signature, user_id) => {
    return db.query(
        `INSERT INTO petition (signature, user_id)
        VALUES ($1, $2)
        RETURNING *`,
        [signature || null, user_id || null] // [first, last, sig] you need to use the ${1}... and an array to inject user input data -> Otherwise you can be attached by executable code (SQL injection attack)
    );
};

exports.getSignature = user_id => {
    return db.query(`SELECT signature FROM petition WHERE user_id = $1`, [
        user_id
    ]);
};

exports.getCount = () => {
    return db.query(`SELECT COUNT(signature) FROM petition`);
};

exports.getNames = () => {
    return db.query(
        `SELECT users.firstname, users.lastname, users.ts_user, user_profiles.age, user_profiles.city, user_profiles.url
        FROM petition
        LEFT JOIN user_profiles
        ON user_profiles.user_id = petition.user_id
        LEFT JOIN users
        ON users.id = petition.user_id`
    );
};

exports.createUser = (firstname, lastname, email, password) => {
    return db.query(
        `INSERT INTO users (firstname, lastname, email, password)
        VALUES ($1, $2, $3, $4)
        RETURNING id, firstname, lastname`,
        [firstname || null, lastname || null, email || null, password || null]
    );
};

exports.getUser = email => {
    return db.query(
        `SELECT *
         FROM users
         WHERE email = $1`,
        [email]
    );
};

exports.updateProfile = (age, city, url, user_id) => {
    return db.query(
        `INSERT INTO user_profiles (age, city, url, user_id)
    VALUES ($1, $2, $3, $4)`,
        [age, city, url, user_id]
    );
};

exports.checkSignature = id => {
    return db.query(`SELECT * FROM petition WHERE user_id = $1`, [id]);
};

exports.getCity = city => {
    return db.query(
        `SELECT users.firstname, users.lastname, user_profiles.age, user_profiles.url
    FROM petition
    LEFT JOIN user_profiles
    ON user_profiles.user_id = petition.user_id
    LEFT JOIN users
    ON users.id = petition.user_id
    WHERE city = $1`,
        [city]
    );
};

exports.prefillProfile = id => {
    return db.query(
        `SELECT users.firstname, users.lastname, users.email, user_profiles.age, user_profiles.city, user_profiles.url
FROM users
LEFT JOIN user_profiles
ON user_profiles.user_id = users.id
WHERE users.id = $1`,
        [id]
    );
};

exports.updateUserWithPw = (firstname, lastname, email, password, id) => {
    return db.query(
        `UPDATE users
        SET firstname = $1, lastname = $2, email = $3, password = $4
        WHERE id = $5`,
        [
            firstname || null,
            lastname || null,
            email || null,
            password || null,
            id || null
        ]
    );
};

exports.updateUserWithoutPw = (firstname, lastname, email, id) => {
    return db.query(
        `UPDATE users
        SET firstname = $1, lastname = $2, email = $3
        WHERE id = $4`,
        [firstname || null, lastname || null, email || null, id || null]
    );
};

exports.updateProfile = (age, city, url, user_id) => {
    return db.query(
        `INSERT INTO user_profiles (age, city, url, user_id)
VALUES ($1, $2, $3, $4)
ON CONFLICT (user_id)
DO UPDATE SET age = $1, city = $2, url = $3
RETURNING id`,
        [age || null, city || null, url || null, user_id || null]
    );
};

exports.deleteSignature = id => {
    return db.query(
        `DELETE FROM petition
        WHERE user_id = $1`,
        [id]
    );
};

exports.deleteUserProfile = id => {
    return db.query(
        `DELETE FROM user_profiles
    WHERE user_id = $1`,
        [id]
    );
};

exports.deletePetition = id => {
    return db.query(
        `DELETE FROM petition
    WHERE user_id = $1`,
        [id]
    );
};

exports.deleteUser = id => {
    return db.query(
        `DELETE FROM users
    WHERE id = $1`,
        [id]
    );
};
// exports.hashPassword = function hashPassword(textPass) {
//     return bcrypt.hash(textPass);
// };
//
// exports.comparePassword = function comparePassword(textPass, hash) {
//     return bcrypt.compare(textPass, hash); //returns a boolean
// };
