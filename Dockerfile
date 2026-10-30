FROM python:3.12-slim
WORKDIR /app
COPY . /app
ENV PORT=8080 REFRESH_HOURS=12
EXPOSE 8080
CMD ["sh", "deploy/entrypoint.sh"]
