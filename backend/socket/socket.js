import { Server } from "socket.io";
import http from "http";
import express from "express";
import Redis from 'ioredis';

const pub = new Redis({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    username: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD
});

const sub = new Redis({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    username: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD
});

pub.on('connect', ( ) => {
    console.log('Publisher');
});

sub.on('connect', ( ) => {
    console.log('Publisher');
});

const app = express();

const server = http.createServer(app);
const io = new Server(server, {
	cors: {
		origin: ["http://localhost:3000"],
		methods: ["GET", "POST"],
	},
});

export const getReceiverSocketId = (receiverId) => {
	return userSocketMap[receiverId];
};

const userSocketMap = {}; // {userId: socketId}

io.on("connection", async (socket) => {
	console.log("a user connected", socket.id);

	const userId = socket.handshake.query.userId;
	if (userId != "undefined") userSocketMap[userId] = socket.id;

	await pub.publish("onlineusers", JSON.stringify(Object.keys(userSocketMap)));

	// socket.on() is used to listen to the events. can be used both on client and server side
	socket.on("disconnect", async () => {
		console.log("user disconnected", socket.id);
		delete userSocketMap[userId];
		await pub.publish("onlineusers", JSON.stringify(Object.keys(userSocketMap)));
	});
});

sub.subscribe("onlineusers", (err, count) => {
    if (err) {
        console.error('Failed to subscribe:', err);
    } else {
        console.log(`Subscribed successfully! Listening for messages on 'onlineusers' channel...`);
    }
});

sub.on('message', (channel, message) => {
	io.emit("getOnlineUsers", message);
    console.log(`Received message from channel '${channel}':`, message);
});

sub.subscribe('newMessage', (err, count) => {
	if (err) {
		console.error('Failed to subscribe to newMessage channel:', err);
	} else {
		console.log(`Subscribed to newMessage channel. Listening for messages...`);
	}
});

sub.on('message', (channel, message) => {
	if (channel === 'newMessage') {
		const { message: newMessage, receiverSocketId } = JSON.parse(message);
		console.log('Received new message from Redis:', newMessage);
		console.log('Receiver Socket ID:', receiverSocketId);
		io.to(receiverSocketId).emit("newMessage", newMessage);
	}
});

export { app, io, server, pub, sub };
