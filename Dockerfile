FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy csproj and restore as distinct layers
COPY ["LibraryManagementAPI/LibraryManagementAPI.csproj", "LibraryManagementAPI/"]
RUN dotnet restore "LibraryManagementAPI/LibraryManagementAPI.csproj"

# Copy everything else and build
COPY . .
WORKDIR "/src/LibraryManagementAPI"
RUN dotnet publish "LibraryManagementAPI.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Build runtime image
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app
EXPOSE 8080
COPY --from=build /app/publish .

ENTRYPOINT ["dotnet", "LibraryManagementAPI.dll"]
