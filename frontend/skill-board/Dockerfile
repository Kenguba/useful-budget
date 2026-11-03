FROM python:3.12-slim
WORKDIR /app
COPY . /app
ENV PORT=7890 REFRESH_HOURS=12
EXPOSE 7890
CMD ["sh", "deploy/entrypoint.sh"]
