import { Router } from 'express';
import { Balades} from "./model.js";
import { isValidObjectId } from "mongoose"

const router = Router();

// 1) Lister toutes les balades disponibles
// Exemple -> http://localhost:1235/all
router.get('/all', (req, res) => {
    Balades.find()
        .then((balades) => {
            res.json(balades);
        })
        .catch((err) => {
            res.status(500).send(err);
        });
});

// 2) Afficher une seule balade via son identifiant unique / si l'id est invalide l'API doit retourner un message d'erreur
// Exemple -> http://localhost:1235/id/6645b78203cb60825982c2f8
router.get('/id/:id', (req, res) => {
    const id = req.params.id;
    if (!isValidObjectId(id)) {
        res.status(400).send("id invalide");
        return
    }
    Balades.findById(id)
        .then((balade) => {
            if (balade) {
                res.json(balade);
            } else {
                res.status(404).send("balade non trouvée");
            }
        })
        .catch((err) => {
            res.status(500).send(err);
        });
});

// 3) Afficher la ou les balades dont les lettres saisies dans:search sont présentes soit dans la clé « nom_poi » soit dans la clé « texte_intro »
// Exemple -> http://localhost:1235/search/Le%202%20square%20de%20Montsouris
router.get('/search/:search', (req, res) => {
    const search = req.params.search;
    Balades.find({
        $or: [
            { nom_poi: { $regex: search, $options: 'i' } },
            { texte_intro: { $regex: search, $options: 'i' } }
        ]
    })
        .then((balades) => {
            res.json(balades);
        })
        .catch((err) => {
            res.status(500).send(err);
        });
});

// 4) Afficher l'ensemble des balades qui disposent d'une clé « url_site » qui a une valeur non null
// Exemple -> http://localhost:1235/site-internet
router.get('/site-internet', (req, res) => {
    Balades.find({ url_site: { $ne: null } })
        .then((balades) => {
            res.json(balades);
        })
        .catch((err) => {
            res.status(500).send(err);
        });
});

// 5) Afficher l'ensemble des balades qui disposent de plus de 5 mots clé dans leur clé « mot_cle »
// Exemple -> http://localhost:1235/mot-cle
router.get('/mot-cle', (req, res) => {
    Balades.find({ $expr: { $gt: [{ $size: "$mot_cle" }, 5] } })
        .then((balades) => {
            res.json(balades);
        })
        .catch((err) => {
            res.status(500).send(err);
        });
});

// 6) Afficher l'ensemble des balades publiés lors de l'année passé en paramètre d'url. 
// Les balades devront être triées de la plus ancienne à la plus récente
// Peut être mettre une limite de 4 caractères pour récupérer que l'année
// Exemple -> http://localhost:1235/publie/2019 (car il n'y a pas de jeu de données pour la période 2020 à 2023)
router.get('/publie/:annee', (req, res) => {
    const annee = req.params.annee.substr(0, 4); // Récupère les 4 premiers caractères pour l'année
    Balades.find({ date_saisie: { $regex: annee } }).sort({ date_saisie: 1 })
        .then((balades) => {
            res.json(balades);
        })
        .catch((err) => {
            res.status(500).send(err);
        });
});

// 7) Compter le nombre de balade pour l'arrondissement écrit dans la clé:num
// Exemple -> http://localhost:1235/arrondissement/1
router.get('/arrondissement/:num_arrondissement', (req, res) => {
    const num_arrondissement = req.params.num_arrondissement;
    Balades.countDocuments({ adresse: { $regex: num_arrondissement } })
        .then((count) => {
            res.json({ count });
        })
        .catch((err) => {
            res.status(500).send(err);
        });
});

// 8) Afficher par arrondissement le nombre de balades disponibles
// Exemple -> http://localhost:1235/synthese
router.get('/synthese', (req, res) => {
    Balades.aggregate([
        { $group: { _id: "$adresse", count: { $sum: 1 } } }
    ])
        .then((synthese) => {
            res.json(synthese);
        })
        .catch((err) => {
            res.status(500).send(err);
        });
});

// 9) Afficher les différentes catégories distinctes de balades disponibles en base de donnée
// Exemple -> http://localhost:1235/categories
router.get('/categories', (req, res) => {
    Balades.distinct("categorie")
        .then((categories) => {
            res.json(categories);
        })
        .catch((err) => {
            res.status(500).send(err);
        });
});

// 10) Permet de créer une nouvelle balade : Attention les clés « nom_poi » / « adresse » et « categorie » sont obligatoires 
// Exemple -> http://localhost:1235/add (avec dans le body { "nom_poi": "Nouvelle balade", "adresse": "1 rue de la paix", "categorie": "parc" })
router.post('/add', (req, res) => {
    const { nom_poi, adresse, categorie } = req.body;
    if (!nom_poi || !adresse || !categorie) {
        res.status(400).send("nom_poi, adresse et categorie sont obligatoires");
        return;
    }
    Balades.create(req.body)
        .then((balade) => {
            res.json(balade);
        })
        .catch((err) => {
            res.status(500).send(err);
        });
});

// 11) Permet d'ajouter un mot clé à une balade existante dans sa clé « mot_cle », 
// Attention le mot clé ajouté doit pas être en doublon avec les mots clé existant. 
// Attention si l'id est invalide afficher une message d'erreur
// Exemple -> http://localhost:1235/add-mot-cle/6645b78203cb60825982c2f8 (avec dans le body { "mot_cle": "nouveau mot clé" })
router.put('/add-mot-cle/:id', (req, res) => {
    const id = req.params.id;
    const mot_cle = req.body.mot_cle;
    if (!isValidObjectId(id)) {
        res.status(400).send("id invalide");
        return;
    }
    Balades.findById(id)
        .then((balade) => {
            if (!balade) {
                res.status(404).send("balade non trouvée");
                return;
            }
            if (balade.mot_cle.includes(mot_cle)) {
                res.status(400).send("mot clé déjà existant");
                return;
            }
            balade.mot_cle.push(mot_cle);
            return balade.save();
        })
        .then((balade) => {
            res.json(balade);
        })
        .catch((err) => {
            res.status(500).send(err);
        });
});

// 12) Permet de mettre à jour une balade via son id, Attention si l'id est invalide afficher une message d'erreur
// Exemple -> http://localhost:1235/update-one/6645b78203cb60825982c2f8 (et mettre dans le body { "nom_poi": "Nouveau nom", ... })
router.put('/update-one/:id', (req, res) => {
    const id = req.params.id;
    if (!isValidObjectId(id)) {
        res.status(400).send("id invalide");
        return
    }
    Balades.findByIdAndUpdate(id, req
        .body, { new: true })
        .then((balade) => {
            if (balade) {
                res.json(balade);
            } else {
                res.status(404).send("balade non trouvée");
            }
        })
        .catch((err) => {
            res.status(500).send(err);
        });
});

// 13) Permet de mettre à jour « nom_poi » de plusieurs balades distante si leur « texte_description » contient les lettres dans la clé search qui est dans l'url
// Exemple -> http://localhost:1235/update-many/Perret (et mettre dans le body { "nom_poi": "Nouveau nom" })
router.put('/update-many/:search', (req, res) => {
    const search = req.params.search;
    Balades.updateMany({ texte_description: { $regex: search } }, { nom_poi: req.body.nom_poi })
        .then((result) => {
            res.json(result);
        })
        .catch((err) => {
            res.status(500).send(err);
        });
});

// 14) Permet de supprimer une balade via son id , Attention si l'id est invalide afficher une message d'erreur
// Exemple -> http://localhost:1235/delete/6645b78203cb60825982c2f8
router.delete('/delete/:id', (req, res) => {
    const id = req.params.id;
    if (!isValidObjectId(id)) {
        res.status(400).send("id invalide");
        return
    }
    Balades.findByIdAndDelete(id)
        .then((balade) => {
            if (balade) {
                res.json(balade);
            } else {
                res.status(404).send("balade non trouvée");
            }
        })
        .catch((err) => {
            res.status(500).send(err);
        });
});

export default router;