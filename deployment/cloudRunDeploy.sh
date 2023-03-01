#!/usr/bin/env bash

# NOTE: The env to deploy is hard-coded to prevent the user from doing a mistake.
deploy_env=creator-eco-stage

read -p "Deploy to "${deploy_env}"? (yes/NO)" ans
[ "yes" == "$ans" ] || exit 1

# Get to the root dir.
cd "$(dirname "${BASH_SOURCE[0]}")"/..

# Get gcloud CLI if needed.
GCP_CLI="$(type -p gcloud)" || GCP_CLI=./deployment/google-cloud-sdk/bin/gcloud
if ! [ -x  "$GCP_CLI" ]; then
    gcloud_version="413.0.0-linux-x86_64"
    gcloud_mirror="https://dl.google.com/dl/cloudsdk/channels/rapid/downloads"
    echo "downloading gcloud CLI $gcloud_version"
    curl "$gcloud_mirror/google-cloud-cli-$gcloud_version.tar.gz" | tar xz
fi

# Create a temporary docker file.
cat > Dockerfile <<EOF
FROM node:18.12.1
WORKDIR /usr/src/app
COPY ./package*.json ./
RUN npm i --omit=dev
COPY ./src/ ./src/
COPY ./site/ ./site/
COPY ./deployment/cloudRun.cjs ./deployment/cloudRun.cjs
CMD ["node", "/usr/src/app/deployment/cloudRun.cjs"]
EOF

# Set working project.
"$GCP_CLI" config set project "$deploy_env"
# Upload docker image.
"$GCP_CLI" builds submit --tag gcr.io/$deploy_env/premium
# Deploy to Cloud Run.
"$GCP_CLI" beta run deploy --env-vars-file=deployment/env.yaml --image gcr.io/$deploy_env/premium --platform managed

rm Dockerfile
