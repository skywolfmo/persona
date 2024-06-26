import { GoogleGenerativeAI } from "@google/generative-ai";
import { Readability } from "@mozilla/readability";
import {marked} from 'marked';
import * as DOMPurify from 'dompurify';

marked.setOptions({
    sanitize: true,
    sanitizer: function(html) {
      // Use a library like DOMPurify to sanitize HTML
      return DOMPurify.sanitize(html);
    }
  });
  
document.addEventListener('DOMContentLoaded', function() {
    const targetInput = document.getElementById('targetInput');
    const searchResults = document.getElementById('searchResults');
    const apiKeyInput = document.getElementById('apiKey');
    const saveApiKeyButton = document.getElementById('saveApiKey');
    const savePersonaKeyButton = document.getElementById('savePersona');
    const summarizeButton = document.getElementById('summarizeButton');
    const loadPersonasButton = document.getElementById('loadPersonasButton');
    let searchTimeout;

    // Load saved API key
    chrome.storage.sync.get('apiKey', function(data) {
        if (data.apiKey) {
            apiKeyInput.value = data.apiKey;
        }
    });





    
    // Save the API key
    saveApiKeyButton.addEventListener('click', function() {
        chrome.storage.sync.set({'apiKey': apiKeyInput.value}, function() {
            alert('API Key saved');
        });
    });
    loadPersonasButton.addEventListener('click', function(){
        loadAndProcessPersonas(createOption);
    });
    savePersonaKeyButton.addEventListener('click', function() {

        chrome.storage.sync.set({'apiKey': apiKeyInput.value}, function() {
            alert('API Key saved');
        });
        const personaName = document.getElementById('personaName').value        
        const personaDescription = document.getElementById('customPrompt').value        
        storePersona(personaName, personaDescription);
        createOption(personaName, personaDescription);

    });

// TODO: add load all personas

    summarizeButton.addEventListener('click', function() {
        const customPrompt = document.getElementById('customPrompt').value;
        const predefinedPrompt = document.getElementById('predefinedPrompts').value;
        const prompt = customPrompt || predefinedPrompt;
    
        summarizeSelectedPages(prompt);
    });
    
    summarizeButton.addEventListener('click', function() {
        const customPrompt = document.getElementById('customPrompt').value;
        const predefinedPrompt = document.getElementById('predefinedPrompts').value;
        const prompt = customPrompt || predefinedPrompt;
    
        summarizeSelectedPages(prompt);
    });
    

    function appendResult(url) {
        const resultElement = document.createElement('div');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = url;
        resultElement.appendChild(checkbox);

        const text = document.createTextNode(` ${url}`);
        resultElement.appendChild(text);

        searchResults.appendChild(resultElement);
    }
    async function summarizeSelectedPages(prompt) {
        // const selectedURLs = Array.from(searchResults.querySelectorAll('input[type="checkbox"]:checked'))
        //                          .map(checkbox => checkbox.value);
    
        // if (selectedURLs.length === 0) {
        //     alert('Please select at least one page to process.');
        //     return;
        // }
        let summarizedContent = '';
        const summariesContainer = document.getElementById('summaries');
        summariesContainer.innerHTML = 'Processing...';
    
        let apiKey = await getApiKey();
    
        try {
            // get the content from the content field aka old search bar
            const content = document.getElementById('targetInput').value
            // bodyText should contain the target email insereted by the user, 
            //  and than the prefix should be the text extracted from the json file
            const summary = await getSummaryFromGeminiPro(content, apiKey, prompt); // First-level summary

            summarizedContent += ` ${summary}\n\n`;
            displaySummary('Results: \n', summarizedContent, summariesContainer);

        } catch (error) {
            console.error('Error summarizing content:', error);
            summariesContainer.innerHTML += `<div>Error occurred while processing.</div>`;
        }
    }
    
    
    function getContentFromStorage(url) {
        return new Promise((resolve, reject) => {
            chrome.storage.local.get(url, function(items) {
                if (chrome.runtime.lastError) {
                    return reject(chrome.runtime.lastError);
                }
                resolve(items[url]);
            });
        });
    }


    async function getMainContent(htmlContent) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
    
        const readability = new Readability(doc);
        const article = readability.parse();
    
        return article.textContent; // or article.content for HTML content
    }
    

    async function getSummaryFromGeminiPro(content, apiKey, prefix) {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        
        const fullContent = prefix + content;
        
        try {
            const result = await model.generateContent(fullContent);
            const response = await result.response;
            return await response.text();
        } catch (error) {
            console.error('Error generating processing:', error);
            throw new Error('Processing failed');
        }
    }
    

    function getApiKey() {
        return new Promise((resolve, reject) => {
            chrome.storage.sync.get('apiKey', function(data) {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve(data.apiKey);
                }
            });
        });
    }
        
    
    function displaySummary(url, summary, container) {
        const summaryElement = document.createElement('div');
        summaryElement.innerHTML = `<b>Processing for ${url}:</b> ${marked(summary)}`;
        container.appendChild(summaryElement);
    }
    
    

    // 
    function storePersona(persona, personaContent) {
        // Load existing personas
        chrome.storage.local.get("personas", function(result) {
            if (chrome.runtime.lastError) {
                console.error("Error loading personas:", chrome.runtime.lastError.message);
                return;
            }
            
            // Extract existing personas or initialize an empty object
            const existingPersonas = result.personas || {};
            
            // Append the new persona
            existingPersonas[persona] = personaContent;
            
            // Store combined personas
            chrome.storage.local.set({ "personas": existingPersonas }, function() {
                if (chrome.runtime.lastError) {
                    console.error("Error storing personas:", chrome.runtime.lastError.message);
                } else {
                    console.log("Persona stored successfully:", persona);
                }
            });
        });
    }
    
    
// 
    // Loading all the saved personas
    function loadAndProcessPersonas(processPersonaFunction) {
        chrome.storage.local.get("personas", function(result) {
            if (chrome.runtime.lastError) {
                console.error("Error loading personas:", chrome.runtime.lastError.message);
                return;
            }
            
            const personas = result.personas || {};
            
            // Iterate through each persona and call the processPersonaFunction for each
            Object.keys(personas).forEach(personaName => {
                const personaDescription = personas[personaName];
                processPersonaFunction(personaName, personaDescription);
            });
        });
    }
    function createOption(personaName, personaContent){
        let select = document.getElementById('predefinedPrompts');
        let opt = document.createElement('option');
        opt.value = personaContent;
        opt.innerHTML = personaName;
        select.appendChild(opt);

    }

});

