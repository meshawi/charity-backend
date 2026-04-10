Dev: docker compose -f docker-compose.dev.yml up --build -d
docker compose exec app node src/seeders/seedAdmin
Prod: put your .env next to docker-compose.yml and run docker compose up --build -d

