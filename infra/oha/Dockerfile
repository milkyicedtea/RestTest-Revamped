FROM debian:bookworm-slim

# Install dependencies
RUN apt-get update && apt-get install -y \
  curl \
  wget \
  gnupg \
  ca-certificates \
  sudo \
  unzip \
  && rm -rf /var/lib/apt/lists/*

# Add Azlux Oha repository and GPG key
RUN wget -O /usr/share/keyrings/azlux-archive-keyring.gpg https://azlux.fr/repo.gpg \
  && echo "deb [signed-by=/usr/share/keyrings/azlux-archive-keyring.gpg] http://packages.azlux.fr/debian/ stable main" \
  | tee /etc/apt/sources.list.d/azlux.list

# Install Oha
RUN apt-get update && apt-get install -y oha \
  && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Mount results folder and any other needed directories
VOLUME ["/app/results"]

# Keep container alive (or override with CMD to run tests)
CMD ["sleep", "infinity"]
