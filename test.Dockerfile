FROM node:10-alpine
WORKDIR /app
RUN mkdir -p /var/lib/postgresql/data
RUN mkdir -p /run/postgresql
RUN apk add --no-cache postgresql postgresql-contrib make python gcc g++ && \
  chown postgres:postgres /var/lib/postgresql &&\
  chmod 0700 /var/lib/postgresql/data &&\
  chown postgres:postgres /var/lib/postgresql/data &&\
  chown postgres:postgres /run/postgresql
COPY package.json /app/package.json
COPY yarn.lock /app/yarn.lock
RUN yarn install &&\
  mv /app/node_modules /tmp/node_modules
COPY . .
RUN rm -rf /app/node_modules && mv /tmp/node_modules /app/node_modules &&\
  yarn build &&\
  chown postgres:postgres /app &&\
  chown postgres:postgres /etc/init.d/postgresql &&\
  chmod 777 /etc/init.d/postgresql
USER postgres:postgres
RUN initdb /var/lib/postgresql/data &&\
    echo "host all  all    0.0.0.0/0  md5" >> /var/lib/postgresql/data/pg_hba.conf &&\
    echo "listen_addresses='*'" >> /var/lib/postgresql/data/postgresql.conf &&\
    postgres -D /var/lib/postgresql/data & sleep 3 && echo "done" &&\
    yarn typeorm:cli migration:run &&\
    yarn test:integration
