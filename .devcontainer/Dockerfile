FROM mcr.microsoft.com/azure-functions/base:4
RUN mkdir -p /home/site/wwwroot
ENV DEBIAN_FRONTEND=noninteractive \
    AzureFunctionsJobHost__Logging__Console__IsEnabled=true

RUN apt-get -y update && \
    apt-get -y install gpg curl && \
    curl https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > /etc/apt/trusted.gpg.d/microsoft.gpg && \
    curl https://packages.microsoft.com/config/debian/$(cat /etc/debian_version | cut -d'.' -f 1)/prod.list > /etc/apt/sources.list.d/microsoft-prod.list && \
    apt-get -y update && \
    apt-get -y install dotnet-sdk-9.0 azure-functions-core-tools-4 libicu-dev git 