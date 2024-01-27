# Description

This repository can hosts an application build on [expressjs], [typescript] with [Apollo] server. The application connects your github repository to list down the repositories and there is scanning feature for each repo. The scanning provides the following data:

- Default Branch
- Is Private
- Owner
- Total File Count
- Any yml file contents (If present)
- All active webhook details
  - Content Type
  - Deliveries Url
  - Events
  - Type
  - Created At
  - Updated At

# Installation

```
npm install
```

# Pre-requesites

- You need to add an environment file. The env file should be the format `{process.env.NODE_ENV}.env` if the `process.env.NODE_ENV != production`. If `process.env.NODE_ENV = production`, then we can add `.env` file.
- The environment file should contain the following details

```
PORT=4000
LOG_LEVEL=debug
QUERY_LOG_FILE=query.log
GITHUB_ACCESS_TOKEN=<Github Personal Access Token>
GITHUB_GRAPHQL_END_POINT=https://api.github.com/graphql
CHUNK_SIZE=2
```

- Your `Github Personal Access Token` should have admin access on the repo level or else the scanning won't be returning the data.

# Start 

The start command is 
```
npm run start
```
- By default the environment is development, but you can setup your environment, just need to add an environment file for the format mentioned above
- This application supports both `Rest API` and `GraphQL`.
    - `Rest API`: The apis for that are `/api/repository`, `/api/repository/{name}`, `/api/scan-all-repository`. All of them are `GET` methods
    - `GraphQL`: There is apollo server initialsed in this App. Once the application is up, you can check the explorer at `/graphql`.