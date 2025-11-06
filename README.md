# Maintenance Tracker

## Setup
### Create a virtual environment
only needed to be executed once
```
python -m venv venv
```

## Activate virtual environment
### Windows
```
venv\Scripts\activate
```
### macOS/Linux
```
source venv/bin/activate
```

## Install Flask & Supabase & TailwindCSS
this step has to be done only once for downloading and setting up the necessary dependencies
```
pip install Flask
```
```
pip install supabase
```
```
npm install tailwindcss @tailwindcss/cli
```

### Start Tailwind CLI build process
first run this:
```
python run.py
```
then
```
npx @tailwindcss/cli -i ./app/static/css/input.css -o ./app/static/css/output.css --watch
```


## Run app
activate virtual environment before executing the command below <br>
note: the correct interpreter has to be selected for the project
```
python run.py
```

DB password<br>
yinwoCxrHFOniZ5W
