var app = require("express").createServer(),
    redis = require("redis").createClient();

/*
** HTTP/1.1 GET /
** Returns all current object locks.
** Format is a JSON string, representing an array of lock objects, eg.
** [
**   { "id":123, "by":"john@company.com", "at":"2010-09-27 10:32:21" },
**   { "id":456, "by":"fred@company.com", "at":"2010-09-27 10:33:21" },
**   { "id":789, "by":"mary@company.com", "at":"2010-09-27 10:32:21" },
** ]
** If successful, returns 200 OK.
*/

app.get('/', function(req, res) {

	/* Get the list of document:* keys */
	redis.keys("document:*", function(error, replies) {

		if (error) {

			/* Redis error */
			res.send(error, 500); //Internal server error

		} else {

			/* Array for storing the results */
			var locks = [];

			/* Make sure we have some locks to process */
			if (replies) {

				var id, lockInfo;

				/* Set the number of keys left to process */
				var count = replies.length;

				/* Process each key */
				replies.forEach(function(reply, i) {

					/* Get the id from the key */
					var id = reply.toString().replace("document:", "");

					/* Get the lock info */
					redis.hgetall(reply, function(error, info) {

						/* Add the item to the array */
						locks.push({
							id: id,
							by: info.by.toString(),
							at: info.at.toString()
						});

						/* Update the number keys left to process */
						count--;

						/* If no more keys, return the JSON string */
						if (count <= 0) {
							res.send(JSON.stringify(locks));
						}

					});

				});

			} else {

				/* No locks, so just return the empty array */
				res.send(JSON.stringify(locks));

			}

		}

	});

});

/*
** HTTP/1.1 GET /{:id}
** Acquires a lock on the specified object.
** If object is already locked, returns 409 Conflict.
** If From request header was not specified, returns 400 Bad Request.
** Otherwise, adds a key to the database with the following attributes:
**   Key: object:{id}
**   Fields:
**     by - the lock owner (value of the HTTP "From" header
**     at - the current date/time
** The key is set to auto-expire after 15mins.
** If successful, returns 201 Created.
*/

app.get('/:id', function (req, res) {

	/* Construct the key */
	var key = "object:" + req.params.id;

	/* Check if this key already exists */
	redis.exists(key, function(error, reply) {

		if (error) {

			/* Redis error */
			res.send(error, 500); //Internal server error

		} else {

			if (1 === reply) {

				/* Object is already locked */
				res.send("Object already locked", 409); // Conflict

			} else {

				/* Get the From header from the request */
				var user = req.header("From");

				if (!user || "" === user || "undefined" === user) {

					/* No from header */
					res.send("Request did not contain a From header", 400); //Bad request

				} else {

					/* Get the current date/time */
					var now = new Date();
			
					/* Create the key */
					redis.hmset(key, "by", user, "at", now);

					/* Set the expiry to 15mins */
					redis.expire(key, 15 * 60);

					res.send(201); //Created

				}

			}

		}
		
	});

});

/*
** HTTP/1.1 DELETE /{:id}
** Releases a lock on the specified object.
** If object is not locked, returns 404 Not Found.
** If From request header was not specified, returns 400 Bad Request.
** If From request header does not match the lock owner, returns 403 Forbidden.
** Otherwise, removes the key from the database and returns 200 OK
*/

app.del('/:id', function (req, res) {

	/* Construct the key */
	var key = "object:" + req.params.id;

	/* Check if this key exists */
	redis.exists(key, function(error, reply) {

		if (error) {

			/* Redis error */
			res.send(error, 500); //Internal server error

		} else {

			if (0 === reply) {

				/* Object is not locked */
				res.send("Object not locked", 404); // Not found

			} else {

				/* Get the From header from the request */
				var user = req.header("From");

				if (!user || "" === user || "undefined" === user) {

					/* No from header */
					res.send("Request did not contain a From header", 400); //Bad request

				} else {

					/* Get the current lock owner */
					redis.hget(key, "by", function(error, reply) {

						if (error) {

							/* Redis error */
							res.send(error, 500); //Internal server error

						} else {

							/* Check the user matches the lock owner */
							if (user != reply) {

								/* Can't release someone else's lock */
								res.send("You (" + user + ") are not the lock holder (" + reply + ")", 403); //Forbidden

							} else {

								/* Delete the key */
								redis.del(key);

								res.send(200); //OK

							}

						}

					});
				}

			}

		}
		
	});

});

app.listen(3000);
console.log('Server running at http://127.0.0.1:3000/');
