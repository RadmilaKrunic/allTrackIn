FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY AllTrackIn.Api.csproj .
RUN dotnet restore -r win-x64

COPY . .
RUN dotnet publish -c Release -r win-x64 --self-contained true \
    -p:PublishSingleFile=true -o /app/publish

FROM mcr.microsoft.com/dotnet/runtime-deps:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .

EXPOSE 8080
ENTRYPOINT ["./AllTrackIn.Api"]