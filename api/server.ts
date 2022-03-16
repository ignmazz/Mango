import express, { Express, urlencoded } from "express";
import cors from "cors";
import session from "express-session";
import cookieParser from "cookie-parser";

import { defModels } from "../src/models/models";
import { log } from "../src/utils/Logger";
import { sequelizeinit } from "../src/index";
import { fetchToken, getUser, getGuilds, getStats, manageGuild } from "./utils/requests";
import { hasTokenExpired } from "./utils/manager";

defModels();

sequelizeinit.sync();

const SequelizeStore = require("connect-session-sequelize")(session.Store);
const store = new SequelizeStore({ db: sequelizeinit, table: "sessions" });

const app: Express = express();

app.use(session({ secret: process.env.SESSION_SECRET, cookie: { secure: false }, store: store, resave: false, saveUninitialized: false }));

app.use(urlencoded({ extended: true }));

app.use(express.json());

app.use(cookieParser());

app.use(
	cors({
		origin: process.env.PRODUCTION_URI,
		credentials: true,
		exposedHeaders: ["set-cookie"],
	})
);

app.get("/", async function (req, res) {
	return res.send({ message: "Welcome to Mango's API!" });
});

app.get("/callback", async function (req, res) {
	const code: string = req.query.code as string;

	const getToken = await fetchToken(code);
	const nextWeekDate = new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000);

	Object.assign(req.session, {
		token: getToken.access_token,
		refresh_token: getToken.refresh_token,
		date: nextWeekDate,
		user: await getUser(getToken.access_token),
		guilds: await getGuilds(getToken.access_token),
	});

	return res.redirect(process.env.PRODUCTION_URI);
});

app.get("/user", hasTokenExpired, async function (req, res) {
	const authed: boolean = req.session.token ? true : false;
	const user: {} = req.session.user;

	return res.send({ authed, user });
});

app.get("/guilds", hasTokenExpired, async function (req, res) {
	const authed: boolean = req.session.token ? true : false;
	const guilds: {} = req.session.guilds;

	return res.send({ authed, guilds });
});

app.get("/manage/:guildId", hasTokenExpired, async function (req, res) {
	if (!req.session.token) {
		return res.status(403).send({ message: "Unauthorized" });
	}

	return res.status(200).send({ guild: await manageGuild(req.params.guildId) });
});

app.get("/logout", async function (req, res) {
	req.session.destroy(null);

	return res.send({ message: "Nothing to see here..." });
});

app.get("/stats", async function (req, res) {
	return res.send({ message: await getStats() });
});

app.use((req, res, next) => {
	const error: Error = new Error("404: not found");

	return res.status(404).json({
		message: error.message,
	});
});

const port = process.env.PORT ?? 3000;

app.listen(port, () => {
	log(`Server is up and running at http://localhost:${port}`);
});

setInterval(async function () {
	await refreshCache();
}, 60 * 1000);

async function refreshCache() {
	const userIDs: string[] = [];
	const sessionModel = sequelizeinit.model("sessions");

	(await sessionModel.findAll()).forEach(async (elm) => {
		const getData = elm.get("data") as any;

		if (!getData.token || userIDs.includes(getData.user.id)) return;

		userIDs.push(getData.user.id);

		const fetchUser = await getUser(getData.token);
		const fetchManagedGuilds = await getGuilds(getData.token);

		await Object.assign(getData, {
			user: fetchUser,
			guilds: fetchManagedGuilds,
		});

		await sessionModel.update({ data: getData }, { where: { data: { user: { id: getData.user.id } } } });
	});

	log("Just refreshed the cache!");
}