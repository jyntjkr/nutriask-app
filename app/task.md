You will generate the **code implementation** (in TypeScript) for a Next.js (App Router) web app that allows a user to upload an image of food, sends the image to the Google Gemini API for image understanding, receives a structured JSON response with food name, ingredients and breakdown, and then renders the results including a chart-based breakdown in the frontend.

Requirements and steps:

1. Setup  
   - Use Next.js (App Router) project structure (e.g., `app/` directory).  
   - Create a frontend upload page (e.g., `app/upload/page.tsx`) where user selects or drags an image file, previews the image, and clicks “Analyze”.  
   - Create a backend API route (e.g., `app/api/analyze/route.ts`) that accepts the uploaded image (via `FormData`) and handles the Gemini API call.

2. Gemini API call  
   - In the backend route, convert the uploaded file into an appropriate format (e.g., base64 or file URI) as required by Gemini’s image-input spec. The API docs note that you can send images via `inlineData` or `fileData`. :contentReference[oaicite:1]{index=1}  
   - Use the Gemini model that supports image understanding (e.g., “gemini-2.5-flash” or whichever is current). :contentReference[oaicite:2]{index=2}  
   - Build the request body JSON:  
     ```json
     {
       "contents": [
         {
           "fileData": {
             "mimeType": "image/jpeg",
             "fileUri": "<url-or-upload-uri>"
           }
         },
         {
           "text": "<instruction prompt: identify food, list ingredients, generate breakdown chart JSON>"
         }
       ]
     }
     ```
     - Ensure you include the image part **and** the prompt part in the sequence.  
   - Add model parameters as needed (temperature, max tokens, etc) as shown in the docs.  
   - Make the request to the Gemini endpoint via REST or SDK (for Node). Example pattern from docs. :contentReference[oaicite:3]{index=3}  

3. Prompt content for Gemini  
   - The text prompt you send (second part) should instruct the model:  
     - “You are given an image of a food item. Identify the food. List the key ingredients. Produce a breakdown of the food item components (e.g., percentage of grain / protein / vegetables) in JSON format, structured so the frontend can easily parse it: { foodItem, alternatives, ingredients, breakdown:[{ component, percent, type }], explanation }.”  
   - Emphasise that the output must be strictly JSON (no extra commentary) so the frontend can parse reliably.  
   - Also instruct what to do if uncertain (provide best guess + confidence).

4. Parsing & frontend rendering  
   - In the backend, once you receive the response from Gemini, parse the JSON string to a JS object.  
   - Return that JSON object to the frontend via the API route.  
   - In the upload page, fetch the `/api/analyze` route, then on success display:  
     - The identified food name and alternatives.  
     - The list of ingredients.  
     - A chart (e.g., using a chart library like `recharts`, `chart.js`, or `@nivo/bar`) that takes the `breakdown` array and visualises component vs percent.  
     - A short explanation text from the `explanation` field.

5. Error/uncertainty handling  
   - If the response lacks valid JSON or the model indicates low confidence, display a user-friendly message (e.g., “Could not confidently identify the food, please try another image”).  
   - Validate that the image size is within Gemini’s supported limits (≤ 7 MB). :contentReference[oaicite:4]{index=4}  
   - Provide fallback UI for image upload errors.

6. Code style & structure  
   - Use TypeScript types/interfaces for the response object (e.g., `interface AnalysisResult { foodItem: string; alternatives: string[]; ingredients: string[]; breakdown: { component: string; percent: number; type: string }[]; explanation: string; }`).  
   - Use React hooks (`useState`, `useEffect`) in frontend.  
   - Use Next.js `page.tsx`, `route.ts`, and API route conventions.  
   - Handle loading/spinner state and error states in UI.

7. Environment/config  
   - Read Gemini API key or credentials from environment variables (e.g., `process.env.GEMINI_API_KEY`).  
   - Use `node-fetch` or `axios` in backend route to call the Gemini REST endpoint.

8. Comments & documentation  
   - In the generated code, include comments explaining each major section (upload handling, image conversion, API call, response parsing, chart rendering).  
   - Provide guidance in the comments for where to swap in your own chart library.

---

**Please generate full working code files** for the upload page and the API route (and any helper modules) adhering to the above specifications and using best practices for a Next.js App Router project.  

Do *not* include environment-keys or secrets in the code; assume they are set externally.
