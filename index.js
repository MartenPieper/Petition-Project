// Express imports
const express = require("express");
const app = express();
const hb = require("express-handlebars");
const bodyParser = require("body-parser");
app.use(bodyParser.json());

// const secrets = require("./secrets");
// Handlebars imports
app.engine("handlebars", hb());
app.set("view engine", "handlebars");

// Other imports
var cookieSession = require("cookie-session");
var bodyParser = require("body-parser");
const csurf = require("csurf");
const db = require("./db");
var bcrypt = require("./bcrypt");

app.use(
    cookieSession({
        secret: process.env.SESSION_SECRET || require("./secrets").secret, // process.env.SESSION_SECRET || require("./passwords").sessionSecret // Old secret "nobody knows this secret but me"
        maxAge: 1000 * 60 * 60 * 24 * 7 * 6
    })
);

app.disable("x-powered-by");

app.use(express.static("./public"));

// app.use(
//     cookieSession({
//         secret: `I'm always angry.`,
//         maxAge: 1000 * 60 * 60 * 24 * 14
//     })
// );
app.use(bodyParser.json({ limit: "50mb" }));

app.use(
    bodyParser.urlencoded({
        limit: "50mb",
        extended: false
    })
);

app.use(csurf()); // Has to come after bodyParser and cookie.session

app.use(function(req, res, next) {
    res.locals.csrfToken = req.csrfToken();
    next();
});

app.get("/", (req, res) => {
    res.redirect("/register");
});

app.get("/register", (req, res) => {
    if (!req.session.userId) {
        res.render("register", {
            layout: "main"
        });
    } else {
        res.redirect("/petition");
    }
});

app.post("/register", (req, res) => {
    bcrypt
        .hash(req.body.password)
        .then(function(hash) {
            return db.createUser(
                req.body.firstname,
                req.body.lastname,
                req.body.email,
                hash
            );
        })
        .then(function(result) {
            req.session.firstname = result.rows[0].firstname;
            req.session.lastname = result.rows[0].lastname;
            req.session.userId = result.rows[0].id;
        })
        .then(function() {
            res.redirect("/profile");
        })
        .catch(function(err) {
            res.render("register", {
                layout: "main",
                error: err.column
            });
            console.log("Error in POST /register: ", err);
        });
});

app.get("/login", (req, res) => {
    if (!req.session.userId) {
        res.render("login", {
            layout: "main"
        });
    } else {
        res.redirect("/petition");
    }
});

app.post("/login", (req, res) => {
    // // Pass Email to db query -> If error, redirct to login page
    db.getUser(req.body.email)
        .then(function(results) {
            return bcrypt
                .compare(req.body.password, results.rows[0].password)
                .then(function(matches) {
                    if (matches == true) {
                        req.session.userId = results.rows[0].id;
                        req.session.firstname = results.rows[0].firstname;
                        req.session.lastname = results.rows[0].lastname;
                        return db.checkSignature(req.session.userId);
                    } else {
                        throw new Error();
                        // res.render("login", {
                        //     layout: "main",
                        //     error: "Password"
                        // });
                    }
                });
        })
        .then(function(data) {
            if (data.rows.length > 0) {
                req.session.signed = "true";
                res.redirect("thanks");
            } else {
                res.redirect("/petition");
            }
        })
        .catch(function(err) {
            console.log("Error in POST /login", err);
            res.render("login", {
                layout: "main",
                error: "Email"
            });
        });
});

app.get("/profile", (req, res) => {
    if (!req.session.editedProfile) {
        res.render("profile", {
            layout: "main"
        });
    } else {
        res.redirect("/petition");
    }
});

app.post("/profile", (req, res) => {
    return db
        .updateProfile(
            req.body.age,
            req.body.city,
            req.body.url,
            req.session.userId
        )
        .then(function() {
            req.session.editedProfile = "true";
            res.redirect("/petition");
        })
        .catch(function(err) {
            console.log("Error in POST /profile", err);
        });
});

app.get("/petition", (req, res) => {
    if (!req.session.signed) {
        res.render("petition", {
            layout: "main"
        });
    } else {
        res.redirect("/thanks");
    }
});

app.post("/petition", (req, res) => {
    db.createPetition(req.body.signature, req.session.userId)
        .then(function() {
            console.log("req.body.signature: ", req.body.signature);
            req.session.signed = "true";
            res.redirect("/thanks");
        })
        .catch(function(err) {
            console.log("Error in POST /petition", err);
            res.render("petition", {
                layout: "main",
                error: "error"
            });
        }); // Options: store in a databases, put it in a cookie, store it in cache
});

app.get("/thanks", (req, res) => {
    Promise.all([db.getCount(), db.getSignature(req.session.userId)])
        .then(function([resultCount, resultSignature]) {
            res.render("thanks", {
                layout: "main",
                signups: resultCount.rows[0].count,
                signature: resultSignature.rows[0].signature
            });
        })
        .catch(function(err) {
            console.log("error in GET /thanks", err);
        });
});

app.post("/thanks", (req, res) => {
    Promise.all([db.getCount(), db.getSignature(req.session.userId)])
        .then(function([resultCount, resultSignature]) {
            res.render("thanks", {
                layout: "main",
                signups: resultCount.rows[0].count,
                signature: resultSignature.rows[0].signature,
                email: req.body.email
            });
        })
        .catch(function(err) {
            console.log("error in POST /thanks", err);
        });
});

app.get("/signed", (req, res) => {
    return db.getNames().then(function(results) {
        // var today = new Date();
        // console.log("today", today);
        // var signUp = results.rows.ts_user;
        // console.log("ts_user Signup", results.rows[0].ts_user);
        //
        // function daysBetween(date1, date2) {
        //     //Get 1 day in milliseconds
        //     var one_day = 1000 * 60 * 60 * 24;
        //
        //     // Convert both dates to milliseconds
        //     var date1_ms = date1.getTime();
        //     var date2_ms = date2.getTime();
        //
        //     // Calculate the difference in milliseconds
        //     var difference_ms = date2_ms - date1_ms;
        //
        //     // Convert back to days and return
        //     return Math.round(difference_ms / one_day);
        // }
        // var days = daysBetween(signUp, today);
        // console.log("days", days);
        // var signedSince = today - signUp;
        // var signedSince = today.map(date => new Date(date).getTime());
        // console.log("signedSince", signedSince); // either splice or slice to get only date string from dates or google "date conversion"

        res.render("signed", {
            layout: "main",
            people: results.rows
            // date: days
        });
    });
});

app.get("/signed/:city", (req, res) => {
    return db.getCity(req.params.city).then(function(results) {
        res.render("signedcity", {
            layout: "main",
            city: req.params.city,
            people: results.rows,
            age: results.rows.age,
            url: results.rows.url
        });
    });
});

app.get("/profile/edit", (req, res) => {
    return db.prefillProfile(req.session.userId).then(function(results) {
        res.render("edit", {
            layout: "main",
            firstname: results.rows[0].firstname,
            lastname: results.rows[0].lastname,
            email: results.rows[0].email,
            age: results.rows[0].age,
            city: results.rows[0].city,
            url: results.rows[0].url
        }).catch(function(err) {
            console.log(err);
            res.render("edit", {
                layout: "main",
                firstname: results.rows[0].firstname,
                lastname: results.rows[0].lastname,
                email: results.rows[0].email,
                age: results.rows[0].age,
                city: results.rows[0].city,
                url: results.rows[0].url
            });
        });
    });
});

app.post("/profile/edit", (req, res) => {
    if (req.body.password) {
        bcrypt
            .hash(req.body.password)
            .then(function(hash) {
                Promise.all([
                    db.updateUserWithPw(
                        req.body.firstname,
                        req.body.lastname,
                        req.body.email,
                        hash,
                        req.session.userId
                    ),
                    db.updateProfile(
                        req.body.age,
                        req.body.city,
                        req.body.url,
                        req.session.userId
                    )
                ]);
            })
            .then(function() {
                res.redirect("/petition");
            })
            .catch(function(err) {
                console.log(err);
                res.render("edit", {
                    layout: "main",
                    error: "error"
                });
            });
    } else {
        Promise.all([
            db.updateUserWithoutPw(
                req.body.firstname,
                req.body.lastname,
                req.body.email,
                req.session.userId
            ),
            db.updateProfile(
                req.body.age,
                req.body.city,
                req.body.url,
                req.session.userId
            )
        ])
            .then(function() {
                res.redirect("/petition");
            })
            .catch(function(err) {
                console.log(err);
                res.render("edit", {
                    layout: "main",
                    error: "error"
                });
            });
    }
});

app.post("/signature/delete", (req, res) => {
    return db
        .deleteSignature(req.session.userId)
        .then(function() {
            req.session.signed = null;
            res.redirect("/petition?deleted=true");
        })
        .catch(function(err) {
            console.log("Error in POST /signature/delete", err);
        });
});

app.post("/profile/delete", (req, res) => {
    Promise.all([
        db.deleteUserProfile(req.session.userId),
        db.deletePetition(req.session.userId),
        db.deleteUser(req.session.userId)
    ])
        .then(function() {
            req.session.userId = null;
            req.session.signed = null;
            res.redirect("/register");
        })
        .catch(function(err) {
            console.log("Error in POST /profile/delete", err);
        });
});

app.get("/logout", (req, res) => {
    req.session = null;
    res.redirect("/register");
});

// app.listen(8080, () => console.log("I'm listening"));
app.listen(process.env.PORT || 8080, () => console.log("I'm listening"));
