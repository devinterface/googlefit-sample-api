import dotenv from "dotenv";
dotenv.config();

import express from "express";

import axios from "axios";
import bodyParser from "body-parser";
import cors from "cors";
import { google } from "googleapis";
import moment from "moment";
import queryParse from "query-string";
import request from "request";
import urlParse from "url-parse";

const app = express();
const port = 1234;
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const oauth2Client = new google.auth.OAuth2(
  // clientId
  process.env.GOOGLE_APP_ID,
  // client secret
  process.env.GOOGLE_APP_SECRET,
  "http://localhost:1234/gfit-callback"
);

app.post("/gfit-auth", (req, res) => {
  const scopes = [
    "https://www.googleapis.com/auth/fitness.activity.read https://www.googleapis.com/auth/fitness.sleep.read profile email openid",
  ];

  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    state: JSON.stringify({
      callbackUrl: req.body.callbackUrl,
      userID: req.body.userid,
    }),
  });

  request(url, (err, resp, body) => {
    console.log("error: ", err);
    console.log("statusCode: ", resp && resp.statusCode);
    res.send({ url });
  });
});

app.get("/gfit-callback", async (req, res) => {
  const queryURL = new urlParse(req.url);
  const code = queryParse.parse(queryURL.query).code;

  const tokens = await oauth2Client.getToken(code);
  console.log("result: ", tokens.tokens.access_token);

  const token = tokens.tokens.access_token;

  res.send({ token: token });
});

app.get("/sources", async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader.split(" ")[1];

  try {
    const result = await axios({
      method: "GET",
      headers: {
        authorization: "Bearer " + token,
      },
      "Content-Type": "application/json",
      url: `https://www.googleapis.com/fitness/v1/users/me/dataSources`,
    });
    res.send({ raw: result.data });
  } catch (error) {
    console.log("error: ", error);
    res.send({});
  }
});

app.get("/steps", async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader.split(" ")[1];

  try {
    let daysAgo = moment().subtract(7, "d").startOf("day").toDate();
    let now = new Date();
    const result = await axios({
      method: "POST",
      headers: {
        authorization: "Bearer " + token,
      },
      "Content-Type": "application/json",
      url: `https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate`,
      data: {
        aggregateBy: [
          {
            dataTypeName: "com.google.step_count.delta",
            dataSourceId:
              "derived:com.google.step_count.delta:com.google.android.gms:estimated_steps",
          },
        ],
        bucketByTime: { durationMillis: 86400000 },
        startTimeMillis: daysAgo.getTime(),
        endTimeMillis: now.getTime(),
      },
    });
    let stepArray = result.data.bucket;
    let output = {};
    for (const step of stepArray) {
      const dt = moment(Number(step.startTimeMillis));
      const day = dt.format("DD/MM/YYYY");
      const dailySteps = step.dataset[0].point[0].value[0].intVal;
      output[day] = dailySteps;
    }
    res.send({ parsed: output, raw: result.data });
  } catch (error) {
    console.log("error: ", error);
    res.send({});
  }
});

app.get("/calories", async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader.split(" ")[1];

  try {
    let daysAgo = moment().subtract(7, "d").startOf("day").toDate();
    let now = new Date();
    const result = await axios({
      method: "POST",
      headers: {
        authorization: "Bearer " + token,
      },
      "Content-Type": "application/json",
      url: `https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate`,
      data: {
        aggregateBy: [
          {
            dataTypeName: "com.google.calories.expended",
            dataSourceId:
              "derived:com.google.calories.expended:com.google.android.gms:merge_calories_expended",
          },
        ],
        bucketByTime: { durationMillis: 86400000 },
        startTimeMillis: daysAgo.getTime(),
        endTimeMillis: now.getTime(),
      },
    });
    let caloriesArray = result.data.bucket;
    let output = {};
    for (const calory of caloriesArray) {
      const dt = moment(Number(calory.startTimeMillis));
      const day = dt.format("DD/MM/YYYY");
      const dailyCalories = calory.dataset[0].point[0].value[0].fpVal;
      output[day] = dailyCalories;
    }
    res.send({ parsed: output, raw: result.data });
  } catch (error) {
    console.log("error: ", error);
    res.send({});
  }
});

// app.get("/heart-rates", async (req, res) => {
//   const authHeader = req.headers.authorization;
//   const token = authHeader.split(" ")[1];

//   try {
//     let daysAgo = moment().subtract(10, "d").startOf("day").toDate();
//     let now = new Date();
//     const result = await axios({
//       method: "POST",
//       headers: {
//         authorization: "Bearer " + token,
//       },
//       "Content-Type": "application/json",
//       url: `https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate`,
//       data: {
//         aggregateBy: [
//           {
//             dataTypeName: "com.google.heart_minutes",
//             dataSourceId:
//               "derived:com.google.heart_minutes:com.google.android.gms:merge_heart_minutes",
//           },
//         ],

//         startTimeMillis: daysAgo.getTime(),
//         endTimeMillis: now.getTime(),
//       },
//     });
//     let heartRateArray = result.data.bucket;
//     let output = {};
//     for (const heartRate of heartRateArray) {
//       const dt = moment(Number(heartRate.startTimeMillis));
//       const day = dt.format("DD/MM/YYYY");
//       let point = heartRate.dataset[0].point;
//       let dhr = { fpVal: 0, intVal: 0 };
//       if (Array.isArray(point) && point.length > 0) {
//         let value = point[0].value;
//         dhr["fpVal"] = value[0].fpVal;
//         dhr["intVal"] = value[1].intVal;
//       }
//       output[day] = dhr;
//     }
//     res.send({ parsed: output, raw: result.data });
//     console.log(result);
//     res.send({ raw: result.data });
//   } catch (error) {
//     console.log("error: ", error);
//     res.send({});
//   }
// });

app.get("/sleep", async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader.split(" ")[1];

  try {
    let daysAgo = moment().subtract(20, "d").startOf("day").toDate();
    let now = new Date();

    const result = await axios({
      method: "POST",
      headers: {
        authorization: "Bearer " + token,
      },
      "Content-Type": "application/json",
      url: `https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate`,
      data: {
        aggregateBy: [
          {
            dataTypeName: "com.google.sleep.segment",
            dataSourceId:
              "derived:com.google.sleep.segment:com.google.android.gms:merged",
          },
        ],
        startTimeMillis: daysAgo.getTime(),
        endTimeMillis: now.getTime(),
      },
    });
    res.send({ raw: result.data });
  } catch (error) {
    console.log("error: ", error);
    res.send({});
  }
});

app.listen(port, () => console.log("GOOGLE FIT IS LISTENING ON PORT : ", port));
