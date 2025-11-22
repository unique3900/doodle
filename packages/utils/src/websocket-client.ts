type messageHandler=(type:string, payload:unknown)=>void;


class WebSocketClient {
    private static instance: WebSocketClient | null = null;
    private ws: WebSocket | null = null;
    private url: string;
    private messageHandlers: Set<messageHandler>=new Set();
    private reconnectAttempts=0;
    private maxReconnectAttempts =5;
    private reconnectDelay=1000;
    private isIntentionallyClosed=false;

    private constructor(){
        this.url=process.env.WEBSOCKET_URL || 'ws://localhost:3001';
    }

    static getInstance(): WebSocketClient {
        if(!WebSocketClient.instance){
            WebSocketClient.instance=new WebSocketClient();
        }
        return WebSocketClient.instance;
    }

    // Connect to the websocket server
    connect(): Promise<void>{
        return new Promise((resolve, reject)=>{
            if(this.ws && this.ws.readyState === WebSocket.OPEN){
                resolve();
                return;
            }

            console.log("Websocker client connecting to", this.url);
            this.isIntentionallyClosed=false;

            try {
                this.ws=new WebSocket(this.url);

                this.ws.onopen=()=>{
                    console.log("Websocket connection opened");
                    this.reconnectAttempts=0;
                    resolve();
                }

                this.ws.onmessage=(event)=>{
                    try {
                        const {type, payload}=JSON.parse(event.data);
                        console.log("Websocket received message:", type, payload);

                        this.messageHandlers.forEach(handler=>handler(type, payload));
                    } catch (error) {
                        console.error("Error parsing websocket message:", error);
                    }
                }

                this.ws.onerror=(error)=>{
                    console.log("Websocket error:", error);
                    reject(error);
                }

                this.ws.onclose=()=>{
                    console.log("Websocket connection closed");

                    // Handle if it is intentionally closed or due to an error
                    if(!this.isIntentionallyClosed && this.reconnectAttempts < this.maxReconnectAttempts){
                        this.reconnectAttempts++;
                        console.log("Reconnecting to websocket server (attempt", this.reconnectAttempts, ")");

                        setTimeout(()=>{
                            this.connect().then(resolve).catch(reject);
                        }, this.reconnectDelay * this.reconnectAttempts);
                    }
                }
            } catch (error) {
                console.error("Error connecting to websocket server:", error);
                reject(error);
            }
        })
    }

    // Send a message to the server
    send(type:string, payload:any = {}):void{
        if(!this.ws || this.ws.readyState  !== WebSocket.OPEN){
            console.warn("Websocket not connected. Message not sent:", type, payload);
            return;
        }

        const message= JSON.stringify({type, payload});
        console.log("Sending message to server:", message);
        this.ws.send(message);
    }

    // Register a message handler
    on(type:string, handler:messageHandler):void{
        this.messageHandlers.add(handler);
    }

    // Unregister a message handler
    off(type:string, handler:messageHandler):void{
        this.messageHandlers.delete(handler);
    }

    // Disconnect from the server
    disconnect():void{
        this.isIntentionallyClosed=true;
        if(this.ws){
            this.ws.close();
            this.ws=null;
        }
        this.messageHandlers.clear();
    }

    // Check if the client is connected to the server
    isConnected():boolean{
        return this.ws && this.ws.readyState === WebSocket.OPEN;
    }
}

export const getWebSocketClient=()=>WebSocketClient.getInstance();