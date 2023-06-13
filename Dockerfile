# Use a Python base image
FROM python

# Set the working directory
WORKDIR /app

# Copy requirements.txt to the working directory
COPY requirements.txt .

# Install Python dependencies
RUN pip install -r requirements.txt

# Copy the rest of the application code to the working directory
COPY . .

# Expose the necessary port (e.g., 8000 for Django development server)
EXPOSE 8000
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set the command to run your Django app
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
