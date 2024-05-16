import express from "express" ;
import route from "./router.js";
import { connect } from "mongoose";

connect("mongodb+srv://Vincent:LEdF3ea2DnKwdrYG@vincent.xi68cj5.mongodb.net/Paris")
    .then(() => {
        console.log("connexion mongo réussie");
    })
    .catch((err) => {
        console.log(err);
    });

const app = express();
const PORT = 1235;

app.use(express.json());

app.use(route) ; 

app.listen(PORT , function(){
    console.log(`serveur express écoute sur le port ${PORT}`)
})
