# syntax=docker/dockerfile:1
FROM ubuntu:noble

ARG USER_UID=1000
ARG USER_GID=1000
ARG PROTO_VERSION=0.62.2

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
	&& apt-get install -y --no-install-recommends \
		bash build-essential ca-certificates curl git gzip unzip xz-utils \
	&& rm -rf /var/lib/apt/lists/*

# The base image's `ubuntu` user owns UID 1000, which `dev` takes over so
# files written into the bind-mounted checkout keep the host user's ownership.
# The Yarn cache directory exists up front so its compose volume is owned by
# `dev`.
RUN userdel --remove ubuntu 2>/dev/null || true \
	&& groupadd --gid "${USER_GID}" dev \
	&& useradd --uid "${USER_UID}" --gid "${USER_GID}" --create-home --shell /bin/bash dev \
	&& mkdir -p /home/dev/.yarn/berry \
	&& chown -R dev:dev /home/dev

USER dev

ENV PROTO_HOME=/home/dev/.proto
ENV PATH=/home/dev/.proto/shims:/home/dev/.proto/bin:${PATH}

RUN curl -fsSL https://moonrepo.dev/install/proto.sh | bash -s "${PROTO_VERSION}" --yes

COPY --chown=dev:dev .prototools /home/dev/toolchain/.prototools

RUN cd /home/dev/toolchain \
	&& proto install node \
	&& proto install yarn \
	&& proto install moon
