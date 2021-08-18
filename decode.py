import base64
import json
import numpy as np
import cv2



with open('data.json', 'r') as f:
    json_data = json.load(f)
    data= []
    
    tmp = json_data['message']['data']['0']
    tmp2 = base64.b64decode(tmp)[:100]
    
    print(np.frombuffer(tmp2,dtype=np.uint8))
    # for x in tmp2:
    #     print(x)
    # for x in json_data['message']['data']:
    #     tmp = json_data['message']['data'][x]
    #     print(tmp[:10])
    #     print(base64.b64decode(tmp)[:10])
    #     data.append(np.array(base64.b64decode(tmp)  ))
    #     print((data[0].shape))
    #     # print(data[:10])?
    # data = np.concatenate(data,axis=0)
    # print(data.shape)
    # print(data[:10])



# print(json.dumps(json_data) )
# foo = base64.b64decode(a)
# foo2 = base64.b64decode(b)
# print(type(foo),foo, len(foo))

# import numpy as np

# np_foo = np.frombuffer(foo,dtype=np.uint8)
# np_foo2 = np.frombuffer(foo,dtype=np.uint8)
# print(np_foo,np_foo2)
# print(np.concatenate((np_foo,np_foo2[:-2]),axis=0).reshape(-1,3))


# # print(np_foo.reshape(-1,4))



'''
정리하면

client
1. cv.VideoCapture().read()를 이용해서 영상을 mat으로 변경
2. mat.data를 base64로 변경
 2-1. 이때 10만 개씩 나눠서 base64로 변경한다
 2-2. 전송할때 데이터, size, data[1~N]
3. base64를 json파일로 전송


server

4. 받은 json을 분석
 4-1. size를 보고 data 뭉텅이 개수 추정
 4-2. data뭉텅이를 전부 디코딩하고 numpy로 변경
 4-3. 모든걸 전부다 합쳐서 이미지화

여기까지가 전처리?


'''
