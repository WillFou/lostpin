# V7-001 - Architecture et frontiere de migration

Date : 9 octobre 2026. Statut : sources d'alpha a valider sous .NET.

## Objectif et flux

Conserver LostPin V6.2.3 et installer un point d'entree serveur. Aucune refonte UX et aucune V6.4.

```text
Navigateur : HTML / CSS / JS V6.2.3
    | meme origine : fichiers publics et /config/config.js
    v
LostPin.Web (.NET 10 / ASP.NET Core)
    | IConfiguration : User Secrets en developpement, environnement
    | wwwroot : projection MSBuild sur liste blanche
    | /health/live, /health/ready, /version.json

Navigateur ---> Google Maps JavaScript / Street View
Navigateur ---> PeerJS, contours Paris et services deja utilises en V6
```

## Frontend conserve

Les sources restent dans index.html, src/js, src/css et assets. Le projet les lie vers wwwroot
lors de la compilation/publication. Les assets sont selectionnes par extension.
La racine du depot, les scripts, documents, tests et fichiers de configuration ne sont pas servis.
WebRootPath pointe sur la sortie compilee. StaticWebAssetsEnabled=false evite qu'un manifeste
de developpement reintroduise un autre dossier public ; le projet n'utilise ni Blazor ni Razor.

Seuls deux messages de configuration dans app.js et le paragraphe d'aide HTML sont adaptes.
Les regles, les autres scripts et les CSS restent ceux de V6.2.3.

## Configuration a sortie explicite

RuntimeConfiguration lit GoogleMaps:BrowserApiKey et LostPin:Enabled. Son DTO public contient
uniquement googleMapsApiKey, hosting, serviceAvailable et serviceMessage.
Ne jamais exposer IConfiguration, GetDebugView, une chaine de connexion ou une cle serveur.
Le serialiseur JSON garde l'encodeur protecteur par defaut, sans concatenation de cle.

La cle navigateur est publique par nature. Restrictions HTTP referrer et API obligatoires chez
Google. Une future cle web service sera distincte, cote serveur et absente du DTO public.

## Reseau et deploiement

Ecoute locale par defaut sur 127.0.0.1:8080. AllowedHosts limite aux noms locaux.
HTTPS, proxy, domaine et configuration de production viendront avec le deploiement.
Ne pas ouvrir cette alpha via un port de routeur. Aucun X-Forwarded-* n'est implicitement cru.
Les premieres directives CSP ne constituent pas une politique anti-XSS complete.
Le serveur n'expose aucune API de modification et ne suit aucune URL fournie par le client.

## Contrat HTTP

| Route | Usage |
| --- | --- |
| / et fichiers publics | Frontend V6 |
| /config/config.js | Configuration navigateur generee ; cle navigateur publique |
| /version.json | Version de l'hote, base frontend, tranche |
| /health/live | Processus repondant |
| /health/ready | Configuration locale presente ; 503 sinon ; pas de validation Google |

Configuration et version : no-store. Ressources : no-cache (revalidation).
Aucun fallback vers index.html : les chemins prives et API inconnues restent en 404.

## Etat du jeu, persistance et cout

Le client garde ses regles et sa persistance locale ; un client peut encore modifier un score.
Choix et schema de base seront fixes avec les premieres donnees serveur, pas avec une base vide.
Aucun compte n'est impose dans V7-001. SignalR remplacera PeerJS dans une tranche dediee.

La limite demandee est 4 500 par mois. Un compteur HTTP ne mesure pas la facturation Google.
Maps, Street View et autres services ont des SKU distincts. Le SDK navigateur ne passe pas
entierement par ASP.NET : un compteur backend seul ne garantit pas un plafond Google.
Il faudra definir les unites, mesurer, ajouter admission de parties et restrictions/quotas Google.
Aucun plafond n'est pretendu dans cette tranche.

## References officielles consultees

- .NET : https://dotnet.microsoft.com/en-us/platform/support/policy
- Fichiers statiques : https://learn.microsoft.com/en-us/aspnet/core/fundamentals/static-files?view=aspnetcore-10.0
- User Secrets : https://learn.microsoft.com/en-us/aspnet/core/security/app-secrets?view=aspnetcore-10.0
- Cles Maps : https://developers.google.com/maps/api-security-best-practices
- Facturation : https://developers.google.com/maps/documentation/javascript/usage-and-billing
