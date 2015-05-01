# Podplay.me
Podplay.me - The Multiplatform Podcast Player

## Current Version
v0.1 - Beta 1: The first beta iteration.

## Known Issues
- Navigation sometimes flawed and pushes incorrect states.
    For example, hitting enter on the search bar (or clicking 'VIEW ALL')
    too quickly after typing results in the search page being overridden
    by a quicksearch page (i.e., index: /).
- Audioplayer will often reset the current position on load, skipping, or
    pausing. This is due to the shittiness of AudioJS.
- Long podcast titles extend off tooltip container.
- Keyboard shortcuts don't work after multiple session changes (or logging
    in and out in the same session).

## Unknown Issues
- Please report any unknown issues to dev@podplay.me.

## Future Plans
The following is planned for the next baseline: v0.2 - Beta 2.
- Fix known Beta 1 bugs, listed above.
- Add Podcast Feed caching on the backend to save episode data.
- Add email verification process to registration.
- Implement openSSL encryption for form data.
- Remove AudioJS library entirely from project, replacing with customized javascript player.
- Add more responsive podcast favorite events, so newly favorited podcasts immediately display as such.

For future releases (may change at any time):
- Allow users to susbscribe to new release notifications for their favorite feeds.
- Allow users to rate podcasts.
- Create about megatron for landing page.
- Record user data and implement suggested podcast feature based on user likes/dislikes.
- Allow registered users to view podcast statistical data.
- Allow users to donate directly to the podcast they are listening to.
- Optimize page layout for small-display devices (i.e., smart phones).
- Change license from open-source to closed-source.

## File Tree
`/`
    `app.js` - NodeJS Express Application file
    `gulpfile.js` - NodeJS Server manager
    `package.json` - List of project dependencies
    `events/*` - Socket.IO Event Routes (as included in app.js)
    `lib/*` - Custom NodeJS libraries
    `public/` - Public resources (accessible to client)
        `audiojs/*` - AudioJS plugin
        `javascripts/*` - Local scripts
        `stylesheets/*` - Local style sheets
    `routes/*` - URL request handlers (as included in app.js)
    `views/*` - Jade templates used to generate the HTML pages for client views.

# Cloning / Forking

## Getting Started
1. Clone The Repository `git clone https://github.com/zimmed/podplay.git`
2. Change directories to newly cloned tree `cd podplay`
3. Install required node libraries `npm install`
4. Verify (or modify) the port used for the server in `/gulpfile.js`
5. Lint, generate stylesheets and run server `gulp` (or `sudo gulp` for port 80).

## Build Tasks Provided

### JS Linting
The clientside javascript code in podplay can be linted using JSHint
with `gulp lint`

### LESS Compilation
CSS Stylesheets can be produced from podplay's less sources (found in the styles/ directory)
with `gulp style`

### Run Basic Server
To start a node HTTP server running the podplay express application
run `gulp serve`

### Start database Server
On OSX run `mongod --config /usr/local/etc/mongod.conf`

On Linux use `service start mongod`
