What is node-lock?
==================
Node-lock is a Node.js app that uses the Redis key/value store for storing arbitrary object locks.

For example, you have a document management system and you want to ensure that two users can't edit the same document at the same time.

API
===
The API consists of two HTTP GETs and a DELETE...it doesn't come much simpler that this:
<table>
	<tr>
		<th>HTTP Verb</th>
		<th>URI</th>
		<th>Required HTTP Headers</th>
		<th>HTTP Response Code(s)</th>
		<th>Response Body</th>
		<th>Comment</th>
	</tr>
	<tr>
		<td>GET</td>
		<td>/<br/>eg. http://your.server.com/</td>
		<td>None</td>
		<td>200 OK (success)<br/>500 Internal Server Error (Redis threw an error)</td>
		<td>[
	{"id":123, "by":"john@company.com", "at":"2010-09-27 10:21:32"},
	{"id":456, "by":"fred@company.com", "at":"2010-09-27 10:28:32"},
	{"id":789, "by":"mary@company.com", "at":"2010-09-27 10:36:32"}
]</td>
		<td>Returns the list of locks.</br>Format is a JSON string, respresenting an array of object locks.</td>
	</tr>
	<tr>
		<td>GET</td>
		<td>/{:id}<br/>eg. http://your.server.com/123</td>
		<td>From:{user}<br/>eg. From:john@company.com</td>
		<td>409 Conflict (object already locked)<br/>400 Bad Request (From request header not specified)<br/>201 Created (success)<br/>500 Internal Server Error (Redis threw an error)</td>
		<td>None</td>
		<td>Acquires a lock on the specified object.<br/>The lock automatically expires after 15 mins, unless explicitly released earlier.</td>
	</tr>
	<tr>
		<td>DELETE</td>
		<td>/{:id}<br/>eg. http://your.server.com/123</td>
		<td>From:{user}<br/>eg. From:john@company.com</td>
		<td>404 Not Found (object not locked)<br/>400 Bad Request (From request header not specified)<br/>403 Forbidden (user is not the lock owner)<br/>200 OK (success)<br/>500 Internal Server Error (Redis threw an error)</td>
		<td>None</td>
		<td>Releases a lock on the specified object.<br/>Only the current lock holder can release a lock.</td>
		<td>
	</tr>
</table>

Requirements
============
* [Redis](http://github.com/antirez/redis)
* [Node](http://github.com/ry/node)
* NPM (for installing node packages...curl http://npmjs.org/install.sh | sh)
* Express framework (npm install express)
* Node Redis client (npm install redis)

Running
=======
* Start Redis server (/path/to/redis/src/redis-server)
* Start the Node app (node node-lock.js)

Quick testing with curl
=======================
* Get a lock for object #123:  curl -G -H From:john@company.com http://localhost:3000/123
* Release the lock for object #123:  curl -X DELETE -H From:john@company.com http://localhost:3000/123
* Get the list of current locks:  curl -G http://localhost:3000/