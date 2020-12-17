const express = require("express");
const User = require("../models/users");
const auth = require("../auth");
const router = new express.Router();
const userController = require("../controller/userController");
const postController = require("../controller/postController");
const friendRequestController = require("../controller/friendRequestController");

router.post("/sign-up", userController.signUp);

router.post("/login", userController.login);

router.post("/logout", auth, userController.logout);

router.get("/user/:id", userController.getUser);

router.post("/add-post", auth, postController.addNewPost);

router.post(
  "/friend-request/:toUser",
  auth,
  friendRequestController.sendFriendRequest
);
router.put(
  "/accept-request/:toUser",
  auth,
  friendRequestController.acceptFriendRequest
);
router.delete(
  "/decline-request/:toUser",
  auth,
  friendRequestController.declineFriendRequest
);

router.get("/all-users", userController.getAllUsers);

router.get("/all-posts", auth, postController.getAllPosts);

router.get("/user/posts/:id", auth, postController.getUsersPost);

router.get("/post/:id", auth, postController.getSinglePost);

router.post("/add-comment/:id", auth, postController.addComment);

router.post("/add-reactions/:id", auth, postController.addReactions);

router.get("/non-friends-list", auth, userController.getFriendsSuggestions);

router.get("/user-details", auth, userController.getUserFullDetails);

router.get("/users/search", auth, userController.searchPeople);

router.put("/users/edit", auth, userController.editUsers);

router.get(
  "/users/request/:toUser",
  auth,
  friendRequestController.getAllUsersRequest
);

router.get(
  "/users/received-request",
  auth,
  friendRequestController.getReceivedRequest
);

router.delete("/delete/reaction/:postId", auth, postController.deleteReactions);

module.exports = router;
