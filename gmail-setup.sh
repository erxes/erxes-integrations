#!/bin/bash
# author: Munkh-Orgil Myagmarsuren 
# Create and configure Google Cloud Project for Gmail API

NOCOLOR='\033[0m'
PURPLE='\033[0;35m'
GREEN='\033[0;32m'
RED='\033[0;31m'

PROJECT_ID="erxes-gmail-$(echo $RANDOM)"
TOPIC="erxes-gmail-topic-$(echo $RANDOM)"
SUBSCRIPTION="erxes-gmail-subscription"
SERVICE_ACCOUNT="erxes-service-account-$(echo $RANDOM)"
PUBSUB_SERVICE_ACCOUNT="service-${PROJECT_NUMBER}@gcp-sa-pubsub.iam.gserviceaccount.com"
PUSH_ENDPOINT_URI=""
SERVICE_ACCOUNT_EMAIL=""

function log {
  echo -e "${GREEN}${1}${NOCOLOR}"
}

(
  set -e

  log "Loading... 👾🚀👽"

  echo "
  /*      _\|/_
          (o o)
  +----oOO-{_}-OOo----------------------------------+
  |                                                 |
  |                                                 |
  |            Thanks for using Erxes               |
  |           Let's setup Gmail for you             |
  |     Please install Google Cloud Platform SDK    |
  |  https://cloud.google.com/sdk/docs/quickstarts  |
  |                                                 |
  +-------------------------------------------------*/
  "

  # Initialize 
  gcloud init --skip-diagnostics 

  # Login to account
  gcloud auth login --quiet

  log "Creating GCP Project ${PROJECT_ID}"

  # Create Google Cloud Project
  gcloud projects create ${PROJECT_ID} --name='erxes-gmail-project'

  # Set project as default core/project
  gcloud config set project ${PROJECT_ID}

  log "Enabling Pub/Sub API"

  # Enable Pub/Sub API
  gcloud services enable pubsub.googleapis.com

  log "Enabling Gmail API"

  # Enable Gmail API
  gcloud services enable gmail.googleapis.com

  log "Creating Gmail Topic ${TOPIC}"
  log "This may take a while...😬"

  # If the topic's project was recently created, you may need to wait a few
  # minutes for the project's organization policy to be properly initialized,
  # and then retry this operation.
  sleep 60

  # Create Gmail Topic
  gcloud pubsub topics create ${TOPIC}

  log "Creating Gmail subscription ${SUBSCRIPTION}"

  # configure the subscription push identity
  gcloud pubsub subscriptions create ${SUBSCRIPTION} \
   --topic=${TOPIC} \
   --topic-project=${PROJECT_ID} \
   --push-endpoint=${PUSH_ENDPOINT_URI}
  # --push-auth-service-account=${SERVICE_ACCOUNT_EMAIL} \

  log "Adding publish role to gmail-api-push service account"

  # Add gmail api service account pub/sub - publish role
  gcloud pubsub topics add-iam-policy-binding ${TOPIC} \
   --member="serviceAccount:gmail-api-push@system.gserviceaccount.com" \
   --role="roles/pubsub.publisher"

  log "Gmail setup succesfully done 🛸🛸🛸"
  log "ＥＲＸＥＳ Rocks!"
)

errorCode=$?

if [ $errorCode -ne 0 ]; then
  log "Error occurred while setting up GCP - Gmail"
  exit $errorCode
fi
