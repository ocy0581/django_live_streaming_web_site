from channels.generic.websocket import AsyncWebsocketConsumer
import json
class ChatConsumer(AsyncWebsocketConsumer):
    
    async def connect(self):
        self.room_group_name = "TestRoom"
        # self.channel_name = "Test-Room"
        
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        # print(self.channel_name)
        await self.accept()



        

    async def disconnect(self, code):
        
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

        print('Disconnected')

        
        

    async def receive(self, text_data):
        receive_dict = json.loads(text_data)
        message = receive_dict['message']
        action = receive_dict['action']

        print(action)
        # print(receive_dict["peer"])

        if(action == 'cam'):
            import base64
            
            return

        if(action == 'new-offer') or (action == 'new-answer'):
            # print(self.channel_name, type(self.channel_name))
            
            receiver_channel_name = receive_dict['message']['receiver_channel_name']


            receive_dict['message']['receiver_channel_name'] = self.channel_name
            


            await self.channel_layer.send(
                receiver_channel_name,
                {
                    'type' : 'send.sdp',
                    'receive_dict':receive_dict
                }   
            )

            return

        receive_dict['message']['receiver_channel_name'] = self.channel_name
        # print(receive_dict)
        # print(receive_dict['message']['reciver_channel_name'])
        # print(self.channel_layer)
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type' : 'send.sdp',
                'receive_dict':receive_dict
            }   
        )


    async def send_sdp(self, event):
        receive_dict = event['receive_dict']
        # print(receive_dict)
        await self.send(text_data=json.dumps(receive_dict))


    