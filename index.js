const express = require("express");
const { MongoClient, ServerApiVersion } = require("mongodb");
const app = express();
const axios = require("axios");
const dotenv = require("dotenv");
dotenv.config();
//variables de entorno
const uri = process.env.URL_MONGO;
const subdomain = process.env.SUBDOMAIN_KOMMO;
const dbName = process.env.NAME_DB;
const port = process.env.PORT || 3000;
let variables = {
  access_token: "",
  refreshTkn: "",
};
//levanto server de mongodb
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

//funcion para obtener el token
async function getCodes() {
    console.log("getCodes");
    await client.connect();
    const collection = client.db(dbName).collection("variables");
    const result = await collection.find().sort({ _id: -1 }).limit(1).toArray();
    variables.access_token = result[0].access_token;
    variables.refreshTkn = result[0].refresh_token;
    console.log("codes obtained");
  }
  //funcion para renovar el token
  async function postRequest() {
    //funcion para renovar el token
    const url = `https://${subdomain}/oauth2/access_token`;
    const data = {
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: variables.refreshTkn,
      redirect_uri: "https://localhost",
    };
    const headers = { "Content-Type": "application/json" };
    try {
      const response = await axios.post(url, data, { headers });
      const parsedData = response.data;
      if ("refresh_token" in parsedData) {
        await uploadCodes(parsedData.access_token, parsedData.refresh_token);
      } else {
        throw new Error("No refresh token in response");
      }
    } catch (error) {
      throw error;
    }
  }
  //funcion para subir el token a la base de datos
  async function uploadCodes(access_token, refresh_token) {
    console.log("uploadCodes");
    await client.connect();
    const collection = client.db(dbName).collection("variables");
    await collection.insertOne({
      access_token,
      refresh_token,
      created_at: new Date(),
    });
    console.log("codes uploaded");
  }
  //function para intercambiar codigo por token
  async function refreshTokenFirsTime() {
    console.log("refreshTokenFirsTime");
    const url = `https://${subdomain}/oauth2/access_token`;
    const data = {
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      grant_type: "authorization_code",
      code: process.env.CODE,
      redirect_uri: "https://localhost",
    };
    const headers = { contentType: "application/json" };
    try {
      const response = await axios.post(url, data, { headers });
      const parsedData = response.data;
      if ("refresh_token" in parsedData) {
        await uploadCodes(parsedData.access_token, parsedData.refresh_token);
      } else {
        throw new Error("No refresh token in response");
      }
    } catch (error) {
      throw error;
    }
  }
async function ping() {
  const url = "https://serverintegration-dev-gfbs.1.us-1.fl0.io/checkping";
  try {
    const response = await axios.get(url);
    console.log(response.data);
  } catch (error) {
    console.error(error);
  }
}

app.post("/token", async (req, res) => {
    try {
      await getCodes();
      await postRequest();
      res.json({ exitoso: true });
    } catch (err) {
      res.sendStatus(500).json({ error: err.message });
    }
  });
app.get("/checkping", async (req, res) => {
  try {
    await ping();
    res.json({ exitoso: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`);
    }
);
