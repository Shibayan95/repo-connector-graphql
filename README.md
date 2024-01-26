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