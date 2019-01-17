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
const csurf = require("csurf");
const db = require("./db");
var bcrypt = require("./bcrypt");

// Middleware START
app.use(
    cookieSession({
        secret: process.env.SESSION_SECRET || require("./secrets").secret,
        maxAge: 1000 * 60 * 60 * 24 * 7 * 6
    })
);

app.disable("x-powered-by");

app.use(express.static("./public"));

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

// Middleware end

// Routes START

// Redirect of default route to register
app.get("/", (req, res) => {
    res.redirect("/register");
});

// Register GET route - Rendering register page or redirecting logged in users
app.get("/register", (req, res) => {
    if (!req.session.userId) {
        res.render("register", {
            layout: "main"
        });
    } else {
        res.redirect("/petition");
    }
});

// Register POST route -  db query to save user data + setting cookie, then redirecting to profile or rejecting input
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

// Login GET route - Rendering login page or redirecting logged in users
app.get("/login", (req, res) => {
    if (!req.session.userId) {
        res.render("login", {
            layout: "main"
        });
    } else {
        res.redirect("/petition");
    }
});

// Login POST route - db query to validate user input, setting cookie, then redirecting
app.post("/login", (req, res) => {
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

// Profile GET route - Rendering the profile page including additional information.
app.get("/profile", (req, res) => {
    if (!req.session.editedProfile) {
        res.render("profile", {
            layout: "main"
        });
    } else {
        res.redirect("/petition");
    }
});

// Profile POST route - db query to safe additional profile information
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

// Petition GET route - Rendering petition sign page if user has not signed, otherwise redirect to /thanks route.
app.get("/petition", (req, res) => {
    if (!req.session.signed) {
        res.render("petition", {
            layout: "main"
        });
    } else {
        res.redirect("/thanks");
    }
});

// Petition POST route - db query to safe signature string, then redirect.
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
        });
});

// Thanks GET route - Rendering page with signup count and signature overview
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

// Thanks POST route -
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

// Signed GET route -
app.get("/signed", (req, res) => {
    return db.getNames().then(function(results) {
        res.render("signed", {
            layout: "main",
            people: results.rows
        });
    });
});

// Signed:city GET route -
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

// profile/edit GET route -
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

// profile/edit POST route -
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

// signature/delete POST route -
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

// profile/delete POST route -
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

// logout GET route -
app.get("/logout", (req, res) => {
    req.session = null;
    res.redirect("/register");
});

app.listen(process.env.PORT || 8080, () => console.log("I'm listening"));
