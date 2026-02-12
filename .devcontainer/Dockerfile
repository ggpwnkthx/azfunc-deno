FROM denoland/deno:bin AS deno
FROM mcr.microsoft.com/azure-functions/base:4
COPY --from=deno /deno /usr/local/bin/deno
RUN deno upgrade
ENV HOME=/root
ENV PATH=/root/.local/bin:${PATH}
RUN mkdir -p /home/site/wwwroot