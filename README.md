# Setup google fit API from google developer console

TBD

# Installation

`npm install`

`cp .env.example .env`

add the right values for

```
GOOGLE_APP_ID=xxx
GOOGLE_APP_SECRET=xxx
```

# Running the app

1- `npm run dev`

2- POST request to: `http://localhost:1234/gfit-auth`

```
curl --request POST \
  --url http://localhost:1234/gfit-auth \
  --header 'Content-Type: application/json'
```

3- past in the browser the content of `url` response

4- authorize the google fit application

5- store the value of `token` value

6- perform the requests from Insomnia client, by using the token as Bearer`
