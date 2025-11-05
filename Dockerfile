FROM nginx:alpine

# Copy site content to the default nginx public directory
COPY index.html /usr/share/nginx/html/index.html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
