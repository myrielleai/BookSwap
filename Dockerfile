# BookSwap API image for Render.
# Serves backend/ with Apache so backend/.htaccess handles routing and the
# Authorization header. The React frontend is deployed separately on Vercel.
FROM php:8.2-apache

RUN docker-php-ext-install pdo_mysql \
 && a2enmod rewrite headers \
 && sed -ri 's/AllowOverride None/AllowOverride All/g' /etc/apache2/apache2.conf

# Matches the repo layout: UPLOAD_DIR and STORAGE_DIR resolve to /var/www/uploads
# and /var/www/storage, outside the web root.
COPY backend/ /var/www/html/
RUN mkdir -p /var/www/uploads/books /var/www/storage \
 && chown -R www-data:www-data /var/www/uploads /var/www/storage

# Render routes traffic to $PORT (10000 by default).
# Render's secret files (/etc/secrets) are readable by root only, but PHP runs
# as www-data, so the database CA certificate is copied somewhere it can read.
ENV PORT=10000
CMD if [ -n "$DB_SSL_CA" ] && [ -f "$DB_SSL_CA" ]; then \
      cp "$DB_SSL_CA" /etc/ssl/certs/db-ca.pem && chmod 644 /etc/ssl/certs/db-ca.pem \
      && export DB_SSL_CA=/etc/ssl/certs/db-ca.pem; \
    fi \
 && sed -i "s/Listen 80$/Listen ${PORT}/" /etc/apache2/ports.conf \
 && sed -i "s/<VirtualHost \*:80>/<VirtualHost *:${PORT}>/" /etc/apache2/sites-available/000-default.conf \
 && apache2-foreground
