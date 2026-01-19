pipeline {
  agent any

  options {
    timestamps()
  }

  environment {
    // Docker Hub image repo (format: dockerhubUsername/repository)
    // Example: balram04/devmeet-backend
    DOCKER_IMAGE = 'yourdockerhubuser/devmeet-backend'
    EC2_SSH_TARGET = 'ubuntu@YOUR_EC2_PUBLIC_IP_OR_DNS'

    // Where we keep the compose + .env on the server
    REMOTE_APP_DIR = '/opt/devmeet-backend'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Build & Push Docker Image') {
      steps {
        script {
          def shortSha = (env.GIT_COMMIT ?: 'nosha').take(7)
          env.IMAGE_TAG = "${env.BUILD_NUMBER}-${shortSha}"
        }

        withCredentials([
          usernamePassword(
            credentialsId: 'dockerhub',
            usernameVariable: 'DOCKERHUB_USER',
            passwordVariable: 'DOCKERHUB_TOKEN'
          )
        ]) {
          // NOTE: This stage expects a Jenkins agent that can run Docker (typically Linux).
          // Use a Docker Hub Access Token as DOCKERHUB_TOKEN (recommended), not your password.
          sh 'docker version'
          sh 'docker login -u "$DOCKERHUB_USER" -p "$DOCKERHUB_TOKEN"'

          sh "docker build -t ${DOCKER_IMAGE}:${IMAGE_TAG} -t ${DOCKER_IMAGE}:latest ."
          sh "docker push ${DOCKER_IMAGE}:${IMAGE_TAG}"
          sh "docker push ${DOCKER_IMAGE}:latest"
        }
      }
    }

    stage('Deploy to EC2 (Docker Compose)') {
      steps {
        sshagent(credentials: ['ec2-ssh-key']) {
          sh """
            ssh -o StrictHostKeyChecking=no ${EC2_SSH_TARGET} '
              set -e

              sudo mkdir -p ${REMOTE_APP_DIR}
              sudo chown -R $USER:$USER ${REMOTE_APP_DIR}
              cd ${REMOTE_APP_DIR}

              # One-time: place your production .env here manually (NOT from Jenkins)
              if [ ! -f .env ]; then
                echo "Missing ${REMOTE_APP_DIR}/.env on server. Create it before first deploy." 1>&2
                exit 2
              fi

              # One-time: create docker-compose.yml if not present
              if [ ! -f docker-compose.yml ]; then
                cat > docker-compose.yml << EOF
services:
  api:
    image: ${DOCKER_IMAGE}:latest
    restart: unless-stopped
    env_file:
      - ./.env
    ports:
      - "3000:3000"
EOF
              fi

              docker pull ${DOCKER_IMAGE}:latest

              # Works with Docker Compose v2 (docker compose). For older systems, replace with docker-compose.
              docker compose up -d

              docker image prune -f
            '
          """
        }
      }
    }
  }

  post {
    always {
      cleanWs()
    }
  }
}
