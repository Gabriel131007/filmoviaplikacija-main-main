var express = require('express');
var router = express.Router();
var db = require("../services/db");

const roomsSchema = require("../schemas/rooms");

router.get("/create", function (req, res, next) {
    res.render("rooms/create");
});

router.get("/delete", async function (req, res, next) {
    let conn;
    try {
        conn = await db.getConnection();
        const query = "SELECT * FROM rooms;";
        const stmt = await conn.prepare(query);
        const result = await stmt.execute();

        
        res.render("rooms/delete", { rooms: result });
    } catch (error) {
        res.render("rooms/delete", { error_database: true });
    } finally {
        conn.release();
    }

});
router.post("/delete", async function (req, res, next) {
    const roomId = req.body.room_id;

    if (!roomId) {
        res.render("rooms/delete", { error_validation: true });
        return;
    }

    let conn;
    try {
        conn = await db.getConnection();

        
        const deleteUsageQuery = "DELETE FROM `usage` WHERE room_id = ?;";
        const stmt1 = await conn.prepare(deleteUsageQuery);
        await stmt1.execute([roomId]);

        
        const deleteRoomQuery = "DELETE FROM rooms WHERE id = ?;";
        const stmt2 = await conn.prepare(deleteRoomQuery);
        const result = await stmt2.execute([roomId]);

        if (result.affectedRows === 1) {
            res.render("rooms/delete", { success: true });
        } else {
            res.render("rooms/delete", { error_database: true });
        }
    } catch (error) {
        res.render("rooms/delete", { error_database: true });
    } finally {
        conn.release();
    }
});


router.post("/create", async function (req, res, next) {
    const result = roomsSchema.validate(req.body);

    if (result.error) {
        res.render("rooms/create", { error_validation: true });
        return;
    }

    let conn;
    try {
        conn = await db.getConnection();
        const query = "INSERT INTO rooms (name) VALUES (?);";
        const stmt = await conn.prepare(query);
        const result = await stmt.execute([req.body.name]);
        res.render("rooms/create", { success: true });
    } catch (error) {
        res.render("rooms/create", { error_database: true });
    } finally {
        conn.release();
    }
});

router.get("/usage/:id", async function (req, res, next) {
    const roomId = req.params.id;

    let conn, room;
    try {
        conn = await db.getConnection();
        const query = "SELECT * FROM rooms WHERE id = ?;";
        const stmt = await conn.prepare(query);
        const result = await stmt.execute([roomId]);
        if (result.length === 1) {
            room = result[0];
        } else {
            res.render("rooms/usage", { invalid_id: true });
        }

        const query2 = "SELECT g.*, r.name FROM `usage` g, users r " +
            "WHERE g.room_id = ? AND r.id = g.user_id ORDER BY g.signed_in DESC;";
        const stmt2 = await conn.prepare(query2);
        const result2 = await stmt2.execute([roomId]);

        res.render("rooms/usage", { items: result2, room_id: roomId });
    } catch (error) { } finally {
        conn.release();
    }
});

router.get("/sign_in/:id", async function (req, res, next) {
    const roomId = req.params.id;
    const userEmail = req.userEmail;

    if (!userEmail) {
        res.render("rooms/sign_in", { user_unknown: true });
    }

    let conn;
    try {
        conn = await db.getConnection();
        const query = "SELECT id FROM users WHERE email = ?;";
        const stmt = await conn.prepare(query);
        const result = await stmt.execute([userEmail]);
        const userId = result[0].id;
        
        const query2 = "INSERT INTO `usage` (user_id, signed_in, room_id) VALUES (?, ?, ?);"
        const stmt2 = await conn.prepare(query2);
        const result2 = await stmt2.execute([userId, new Date(), roomId]);

        if (result2.affectedRows === 1) {
            res.redirect("/rooms/usage/" + roomId);
        } else {
            res.render("rooms/sign_in", { error_database: true });
        }
    } catch (error) {
        res.render("rooms/sign_in", { error_database: true });
    } finally {
        conn.release();
    }
});

module.exports = router;