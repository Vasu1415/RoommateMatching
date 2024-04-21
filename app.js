const http = require('http'); 
const bodyParser = require("body-parser");  
const express = require('express'); 
const app = express();    
const path = require("path"); 
const tailwind = require('tailwindcss')

const { MongoClient, ServerApiVersion } = require('mongodb');
require("dotenv").config({ path: path.resolve(__dirname, 'credentialsDontPost/.env') }) 

const databaseAndCollection = {db: `${process.env.MONGO_DB_NAME}`, collection:`${process.env.MONGO_COLLECTION}`};
const user_name = process.env.MONGO_DB_USERNAME;
const password = process.env.MONGO_DB_PASSWORD;
const uri = 'mongodb+srv://Mittens1415:nRl%38jJUokLjxVDoa@cluster1415.r81rd4e.mongodb.net/';
const client = new MongoClient(uri, {serverApi: ServerApiVersion.v1 });

process.stdin.setEncoding("utf8");

if (process.argv.length != 3) { 
	process.stdout.write(`Usage: node app.js portNumber\n`); 
	process.exit(1); 
}
const portNumber = process.argv[2];
console.log(`Web server started and running at http://localhost:${portNumber}`); 
process.stdout.write(`Stop to shutdown the server: `);
process.stdin.on("readable", function (){ 
    let dataInput = process.stdin.read(); 
	if (dataInput != null){ 
	    let command = dataInput.trim(); 
	    if (command === "stop"){ 
	        process.stdout.write("Shutting down the server\n"); 
	        process.exit(0); 
	    }else{
            process.stdout.write("Invalid Command\n");
            process.exit(1);
        }
    }
});

app.use(bodyParser.urlencoded({extended:false}));


app.get("/", (request, response) => {  
    const variable = {portNumber};
	response.render("main_page",variable);  
});

function find_similar_users(currentUser, remainingUsers) {
    const matches = [];

    remainingUsers.forEach(user => {
        let similarityCount = 0;

        // Compare preferences
        if (currentUser.preferences.roommateMinimumAge === user.preferences.roommateMinimumAge) {
            similarityCount++;
        }
        if (currentUser.preferences.roommateMaximumAge === user.preferences.roommateMaximumAge) {
            similarityCount++;
        }
        if (currentUser.preferences.dailyRoutine === user.preferences.dailyRoutine) {
            similarityCount++;
        }
        if (currentUser.preferences.prefer_gender === user.preferences.prefer_gender) {
            similarityCount++;
        }
        if (currentUser.preferences.foodPreference === user.preferences.foodPreference) {
            similarityCount++;
        }
        if (currentUser.preferences.pets === user.preferences.pets) {
            similarityCount++;
        }
        if (currentUser.preferences.guestFrequency === user.preferences.guestFrequency) {
            similarityCount++;
        }
        if (currentUser.preferences.smoking === user.preferences.smoking) {
            similarityCount++;
        }
        matches.push([similarityCount, user]);
    });

    return matches;
}

function sort_match_lst(match_lst) {
    // Sort the match_lst in descending order based on the similarity count
    match_lst.sort((a, b) => b[0] - a[0]);
    return match_lst;
}

function dissimilar_users(final_match_lst) {
    // Filter out users with a similarity count of 0
    const dissimilar_lst = final_match_lst.filter(tuple => tuple[0] === 0);
    return dissimilar_lst;
}

function similar_users(final_match_lst) {
    // Filter out users with a similarity count of at least 1
    const similar_lst = final_match_lst.filter(tuple => tuple[0] >= 1);
    return similar_lst;
}

async function update_remaining_users(similar_lst, currentUser, collection) {
    for (const [similarityCount, user] of similar_lst) {
        user.matches.push(currentUser._id);
        await collection.updateOne(
            { _id: user._id },
            { $set: { matches: user.matches } }
        );
    }
}

async function updating_current_user(currentUser, similar_lst, collection) {
    const currentUserId = currentUser._id;
    const currentUserMatches = currentUser.matches || []; // Ensure matches array exists

    similar_lst.forEach(user => {
        if (!currentUserMatches.includes(user._id)) {
            currentUserMatches.push(user._id); // Add user to matches if not already present
        }
    });

    await collection.updateOne(
        { _id: currentUserId },
        { $set: { matches: currentUserMatches } }
    );
}


app.post("/login", async (req, res) => {
    try {
        await client.connect();
        const database = client.db(process.env.MONGO_DB_NAME);
        const collection = database.collection(process.env.MONGO_COLLECTION);
        const username = req.body.username;  
        const user = await collection.findOne({ email: username });

        if (user && user.password === req.body.password) { // Ensuring password match 
            const remainingUsers = await collection.find({ email: { $ne: username } }).toArray();
            const match_lst = find_similar_users(user, remainingUsers);
            const final_match_lst = sort_match_lst(match_lst);
            const similar_lst = similar_users(final_match_lst);
            updating_current_user(user,similar_lst,collection);
            update_remaining_users(similar_lst,user,collection);
            const non_similar_lst = dissimilar_users(final_match_lst);
            res.render("dashboard",{user,similar_lst,non_similar_lst}); // Render the dashboard view
        } else {
            res.render("error_page"); // Render error page if user not found or password mismatch
        }
    } catch (error) {
        console.error("Login error:", error);
        res.render("error_page");
    } finally {
        await client.close();
    }
});

app.get("/signUp",(request,response) =>{
    const variable = {portNumber};
    response.render("signUp",variable);
})

async function insert_user(client,databaseAndCollection,new_application){
    await client.connect();
    await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).insertOne(new_application);
}

app.post("/signUp", async (req, res) =>{
    console.log("I come here bitch!");
    const { 
        name, gender, age, email, password, phoneNumber, dob, housingPriceRange, locationPreference, blurb, 
        roommateMinimumAge, roommateMaximumAge, dailyRoutine, prefer_gender, foodPreference, pets, guestFrequency, smoking
    } = req.body;

    const userData = {
        name: name,
        gender: gender,
        age: age,
        email: email,
        password: password,
        phoneNumber: phoneNumber,
        dob: dob,
        housingPriceRange: housingPriceRange,
        locationPreference: locationPreference,
        blurb: blurb,
        matches: [],
        preferences: {
            roommateMinimumAge: roommateMinimumAge,
            roommateMaximumAge: roommateMaximumAge,
            dailyRoutine: dailyRoutine,
            prefer_gender: prefer_gender,
            foodPreference: foodPreference,
            pets: pets,
            guestFrequency: guestFrequency,
            smoking: smoking
        }
    };

    try {
        console.log("This is where I am 1");
        await insert_user(client, databaseAndCollection, userData);
    } catch (error) {
        console.error(error);
        res.render("error_page");
    } finally {
        console.log("This is where I am 2");
        await client.close();
    }   
    console.log("This is where I am");
    res.render("signup_successful_page");
});


app.set("views", path.resolve(__dirname, "templates"));  
app.set("view engine", "ejs"); 
app.use(bodyParser.urlencoded({extended:false}));

app.listen(portNumber);