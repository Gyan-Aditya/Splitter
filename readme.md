# Introduction

This is a personal project focused on learning backend security best practices. Built with Express.js and Node.js, it solves bill-splitting problems between friends on trips and occasions.

# LIFE CYCLE of Server(as of now)

Browser -> Expresss Server -> Session -> Database ->middleware -> Route -> Response

Tasks: Implemented user registration and login via local strategey using Passport.
Event filler fixed and Authentication of session implemented with permanent storage.

As of 31-2-26
Added neon database to branch for easy setup of project in each device .
checkout using

- `git switch dbOnline`

# Future Plans

1. completing other routes . /dahboard, /events/create, /events/join, /events/{event_id}
2. Completing the data flow structure and once everything in place refactoring the code for future developement and scalability.
   (NOTE : All the works done by collaboraters should be done using new branches and not directly on the main branch. Once the work is done, create a pull request and get it reviewed by other members before merging it to the main branch.)
