import { ThisReceiver } from '@angular/compiler';
import { Component, OnInit } from '@angular/core';
import { Client } from '@stomp/stompjs';
import * as SockJS from 'sockjs-client';
import { Message } from './models/message';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',

})
export class ChatComponent implements OnInit {

  private client: Client;
  conectado: boolean = false;
  message: Message = new Message();
  messages: Message[] = [];
  escribiendo: string;
  clienteId: string;

  constructor() {
    this.clienteId = 'id-' + new Date().getUTCMilliseconds() + '-' + Math.random().toString(36).substring(2);
  }

  ngOnInit(): void {
    this.client = new Client();
    this.client.webSocketFactory = () => {
      //http://localhost:8080/chat-websocket
      return new SockJS("http://localhost:8080/chat-websocket"); //configuración en el webSocketConfig del back
    }

    //Se escucha si hay conexión
    this.client.onConnect = (frame) => {
      console.log('Conectados: ' + this.client.connected + ' : ' + frame);
      this.conectado = true;

      //escuchar cuando llegan mensajes
      this.client.subscribe('/chat/mensaje', e => {
        let mensaje: Message = JSON.parse(e.body) as Message;
        mensaje.date = new Date(mensaje.date);

        if(!this.message.color && mensaje.tipo == 'NUEVO_USUARIO' && this.message.username == mensaje.username) {
          this.message.color = mensaje.color;
        }

        this.messages.push(mensaje);
        console.log(mensaje);
      });

      this.client.subscribe('/chat/escribiendo', e => {
        this.escribiendo = e.body;
        setTimeout(() => this.escribiendo = '', 3000)
      });

      this.client.subscribe('/chat/historial' + this.clienteId, e => {
        const historial = JSON.parse(e.body) as Message[];
        this.messages = historial.map(m =>{
          m.date = new Date(m.date);
          return m;
        }).reverse();
      });

      this.client.publish({destination: '/app/historial', body:this.clienteId});

      this.message.tipo = 'NUEVO_USUARIO';
      this.client.publish({destination: '/app/mensaje', body: JSON.stringify(this.message)});
    }

    this.client.onDisconnect = (frame) => {
      console.log('Desconectados: ' + !this.client.connected + ' : ' + frame);
      this.conectado = false;
      this.message = new Message();
      this.messages = [];
    }
  }

  //inicializar conexión
  conectar(): void{
    this.client.activate();
  }

  desconectar(): void{
    this.client.deactivate();
  }


  enviarMensaje(): void{
    this.message.tipo = 'MENSAJE';
    this.client.publish({destination: '/app/mensaje', body: JSON.stringify(this.message)});
    this.message.text = '';
    }

  escribiendoEvento(): void {
    this.client.publish({ destination: '/app/escribiendo', body: this.message.username});
  }

}
