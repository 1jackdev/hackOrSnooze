$(async function () {
  // cache some selectors we'll be using quite a bit
  const $allStoriesList = $("#all-articles-list");
  const $filteredArticles = $("#filtered-articles");
  const $loginForm = $("#login-form");
  const $createAccountForm = $("#create-account-form");
  const $submitForm = $("#submit-form");
  const $addStory = $("#add-story");
  const $favoriteTab = $("#favorites");
  const $favoritesList = $("#favorited-articles");
  const $myStoriesTab = $("#my-stories");
  const $myStoriesList = $("#my-articles");
  const $userProfileTab = $("#nav-user-profile");
  const $userProfile = $("#user-profile");
  const $userName = $("#user-name");
  const $userUserName = $("#user-username");
  const $userCreatedDate = $("#user-created-date");
  const $navLogin = $("#nav-login");
  const $navLogOut = $("#nav-logout");
  const $navWelcome = $("#nav-welcome");
  const $pipes = $(".pipe");

  // global storyList variable
  let storyList = null;

  // global currentUser variable
  let currentUser = null;

  await checkIfLoggedIn();

  /**
   * Event listener for logging in.
   *  If successfully we will setup the user instance
   */

  $loginForm.on("submit", async function (evt) {
    evt.preventDefault(); // no page-refresh on submit

    // grab the username and password
    const username = $("#login-username").val();
    const password = $("#login-password").val();

    // call the login static method to build a user instance
    const userInstance = await User.login(username, password);
    // set the global user to the user instance
    currentUser = userInstance;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

  /**
   * Event listener for signing up.
   *  If successfully we will setup a new user instance
   */

  $createAccountForm.on("submit", async function (evt) {
    evt.preventDefault(); // no page refresh

    // grab the required fields
    let name = $("#create-account-name").val();
    let username = $("#create-account-username").val();
    let password = $("#create-account-password").val();

    // call the create method, which calls the API and then builds a new user instance
    const newUser = await User.create(username, password, name);
    currentUser = newUser;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

  $submitForm.on("submit", async function (e) {
    e.preventDefault();

    let author = $("#author").val();
    let title = $("#title").val();
    let url = $("#url").val();

    let newStoryData = { author: author, title: title, url: url };
    const newStory = await StoryList.addStory(currentUser, newStoryData);
    author = $("#author").val("");
    title = $("#title").val("");
    url = $("#url").val("");
    await generateStories();
  });
  /**
   * Log Out Functionality
   */

  $navLogOut.on("click", function () {
    // empty out local storage
    localStorage.clear();
    // refresh the page, clearing memory
    location.reload();
  });

  /**
   * Event Handler for Clicking Login
   */

  $navLogin.on("click", function () {
    // Show the Login and Create Account Forms
    $loginForm.slideToggle();
    $createAccountForm.slideToggle();
    $allStoriesList.toggle();
    $userProfile.hide();
  });

  // Event Handler for showing addStory form
  $addStory.on("click", function () {
    $submitForm.slideToggle();
  });

  $favoriteTab.on("click", async function () {
    $allStoriesList.hide();
    $userProfile.hide();
    $myStoriesList.hide();
    $submitForm.hide();
    $favoritesList.show();
    generateFavorites();
  });

  $myStoriesTab.on("click", function () {
    $allStoriesList.hide();
    $favoritesList.hide();
    $userProfile.hide();
    $submitForm.hide();
    $myStoriesList.show();
    generateMyStories();
  });

  $userProfileTab.on("click", function () {
    $allStoriesList.hide();
    $myStoriesList.hide();
    $submitForm.hide();
    $userProfile.show();
    populateUserData();
  });
  // event handler for clicking favorite icon

  $("body").on("click", ".far.fa-star", async function (e) {
    if (currentUser) {
      const $storyID = this.closest("li").id;
      e.target.classList.toggle("fas");
      e.target.classList.toggle("far");
      const addedToFavorites = await User.addToFavorites(currentUser, $storyID);
    }
  });
  // event handler for unclicking favorite icon
  $("body").on("click", ".fas.fa-star", async function (e) {
    if (currentUser) {
      const $favoriteStoryId = this.closest("li").id;
      e.target.classList.toggle("fas");
      e.target.classList.toggle("far");
      const removedFromFavorites = await User.removeFavorite(
        currentUser,
        $favoriteStoryId
      );
      generateFavorites();
    }
  });

  // event handler for deleting a myStory
  $("body").on("click", ".fas.fa-trash", async function (e) {
    if (currentUser) {
      const $myStoryId = this.closest("li").id;
      const removedFromMyStories = await User.removeStory(
        currentUser,
        $myStoryId
      );
      generateMyStories();
    }
  });

  /**
   * Event handler for Navigation to Homepage
   */

  $("body").on("click", "#nav-all", async function () {
    await generateStories();
    $allStoriesList.show();
    $submitForm.hide();
    $favoritesList.hide();
    $myStoriesList.hide();
    $userProfile.hide();
  });

  /**
   * On page load, checks local storage to see if the user is already logged in.
   * Renders page information accordingly.
   */

  async function checkIfLoggedIn() {
    // let's see if we're logged in
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");
    // if there is a token in localStorage, call User.getLoggedInUser
    //  to get an instance of User with the right details
    //  this is designed to run once, on page load
    currentUser = await User.getLoggedInUser(token, username);
    await generateStories();

    if (currentUser) {
      showNavForLoggedInUser();
      $navWelcome.innerText = currentUser;
    }
  }

  /**
   * A rendering function to run to reset the forms and hide the login info
   */

  function loginAndSubmitForm() {
    // hide the forms for logging in and signing up
    $loginForm.hide();
    $createAccountForm.hide();

    // reset those forms
    $loginForm.trigger("reset");
    $createAccountForm.trigger("reset");

    // show the stories
    $allStoriesList.show();

    // update the navigation bar
    showNavForLoggedInUser();
  }

  /**
   * A rendering function to call the StoryList.getStories static method,
   *  which will generate a storyListInstance. Then render it.
   */

  async function generateStories() {
    // get an instance of StoryList
    const storyListInstance = await StoryList.getStories();
    // update our global variable
    storyList = storyListInstance;
    // empty out that part of the page
    $allStoriesList.empty();

    // loop through all of our stories and generate HTML for them
    for (let story of storyList.stories) {
      const result = generateStoryHTML(story);
      $allStoriesList.append(result);
    }
  }

  /**
   * A function to render HTML for an individual Story instance
   */

  function generateStoryHTML(story) {
    let hostName = getHostName(story.url);

    // render story markup
    const storyMarkup = $(`
      
      <li id="${story.storyId}" class="story">
        <i class="far fa-star"></i>
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-username">posted by ${story.username}</small>
      </li>
    `);

    return storyMarkup;
  }

  async function generateFavorites() {
    // get an instance of StoryList
    const favoritesList = await User.getFavorites(currentUser);

    $favoritesList.empty();
    // loop through all of our stories and generate HTML for them
    for (let favorite of favoritesList.stories) {
      const result = generateFavoriteHTML(favorite);
      $favoritesList.append(result);
    }
  }

  function generateFavoriteHTML(story) {
    let hostName = getHostName(story.url);

    // render story markup
    const storyMarkup = $(`
      
      <li id="${story.storyId}" class="story">
        <i class="fas fa-star"></i>
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-username">posted by ${story.username}</small>
      </li>
    `);

    return storyMarkup;
  }
  /* hide all elements in elementsArr */

  async function generateMyStories() {
    // get an instance of StoryList
    const myStoryList = await User.getMyStories(currentUser);
    // empty out that part of the page
    $myStoriesList.empty();

    // loop through all of our stories and generate HTML for them
    for (let story of myStoryList.stories) {
      const result = generateMyStoryHTML(story);
      $myStoriesList.append(result);
    }
  }

  function generateMyStoryHTML(story) {
    let hostName = getHostName(story.url);

    // render story markup
    const storyMarkup = $(`
      
      <li id="${story.storyId}" class="story">
        <i class="fas fa-trash"></i>
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-username">posted by ${story.username}</small>
      </li>
    `);

    return storyMarkup;
  }

  function populateUserData() {
    $userName.text(currentUser.name);
    $userUserName.text(currentUser.username);
    $userCreatedDate.text(currentUser.createdAt);
  }

  function showNavForLoggedInUser() {
    $navLogin.hide();
    $userProfile.hide();
    $navLogOut.show();
    $addStory.show();
    $submitForm.hide();
    $favoriteTab.show();
    $myStoriesTab.show();
    $navWelcome.show();
    $pipes.show();
  }

  /* simple function to pull the hostname from a URL */

  function getHostName(url) {
    let hostName;
    if (url.indexOf("://") > -1) {
      hostName = url.split("/")[2];
    } else {
      hostName = url.split("/")[0];
    }
    if (hostName.slice(0, 4) === "www.") {
      hostName = hostName.slice(4);
    }
    return hostName;
  }

  /* sync current user information to localStorage */

  function syncCurrentUserToLocalStorage() {
    if (currentUser) {
      localStorage.setItem("token", currentUser.loginToken);
      localStorage.setItem("username", currentUser.username);
    }
  }
});
