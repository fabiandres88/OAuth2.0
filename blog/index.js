const express = require("express");
const path = require("path");
const request = require("request");
const querystring = require("querystring");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const generateRamdonString = require("./utils/generateRamdomString");
const encodedBasic = require("./utils/ecodedBasic");
const scopesArray = require("./utils/scopesArray");

const playlistMock = require("./utils/mocks/playlist");

const { config } = require("./config");

const app = express();

// static files
app.use("/static", express.static(path.join(__dirname, "public")));

// middlewares
app.use(cors());
app.use(cookieParser());

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

function getUserInfo(accessToken) {
  if (!accessToken) {
    return Promise.resolve(null);
  }

  const options = {
    url: "https://api.spotify.com/v1/me",
    headers: { Authorization: `Bearer ${accessToken}` },
    json: true,
  };

  return new Promise((resolve, reject) => {
    request.get(options, function (error, response, body) {
      if (error || response.statusCode !== 200) {
        reject(error);
      }

      resolve(body);
    });
  });
}

function getUserPlaylists(accessToken, userId) {
  if (!accessToken || !userId) {
    return Promise.resolve(null);
  }

  const options = {
    url: `https://api.spotify.com/v1/users/${userId}/playlists`,
    headers: { Authorization: `Bearer ${accessToken}` },
    json: true,
  };

  return new Promise((resolve, reject) => {
    request.get(options, function (error, response, body) {
      if (error || response.statusCode !== 200) {
        reject(error);
      }

      resolve(body);
    });
  });
}

// routes
app.get("/", async function (req, res, next) {
  const { access_token: accessToken } = req.cookies;
  console.log(accessToken);
  try {
    const userInfo = await getUserInfo(accessToken);
    res.render("playlist", {
      userInfo,
      isHome: true,
      playlists: { items: playlistMock },
    });
  } catch (error) {
    next(error);
  }
  // res.render("playlist", {
  //   playlists: { items: playlistMock },
  // });
});

app.get("/playlist", async function (req, res, next) {
  const { access_token: accessToken } = req.cookies;

  if (!accessToken) {
    return res.redirect("/");
  }

  try {
    const userInfo = await getUserInfo(accessToken);
    const userPlaylists = await getUserPlaylists(accessToken, userInfo.id);

    res.render("playlist", { userInfo, playlists: userPlaylists });
  } catch (error) {
    next(error);
  }
});

app.get("/login", (req, res) => {
  const state = generateRamdonString(16);

  const queryString = new URLSearchParams({
    response_type: "code",
    client_id: config.spotifyClientId,
    scope: scopesArray.join(" "),
    redirect_uri: config.spotifyRedirectUri,
    state: state,
  });

  res.cookie("auth_state", state, { httpOnly: true });
  res.redirect(`https://accounts.spotify.com/authorize?${queryString}`);
});

app.get("/logout", function (req, res) {
  res.clearCookie("access_token");
  res.redirect("/");
});

app.get("/callback", (req, res, next) => {
  const { code, state } = req.query;
  const { auth_state } = req.cookies;

  if (state === null || state !== auth_state) {
    next(new Error("The state doesn't match"));
  }

  res.clearCookie("auth_state");

  const authOptions = {
    url: "https://accounts.spotify.com/api/token",
    form: {
      code,
      redirect_uri: config.spotifyRedirectUri,
      grant_type: "authorization_code",
    },
    headers: {
      Authorization: `Basic ${encodedBasic(
        config.spotifyClientId,
        config.spotifyClientSecret
      )}`,
    },
    json: true,
  };

  request.post(authOptions, (error, response, body) => {
    if (error || response.statusCode !== 200) {
      next(new Error("The token in not valid"));
    }

    res.cookie("access_token", body.access_token, { httpOnly: true });
    res.redirect("/playlist");
  });
});

// server
const server = app.listen(3000, function () {
  console.log(`Listening http://localhost:${server.address().port}`);
});
