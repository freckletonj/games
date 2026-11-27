"""Render a genuine mesh turntable and contact sheet with a CPU z-buffer."""
import numpy as np
from numba import njit

@njit(cache=True)
def raster(screen,n,uv,faces,atlas,w,h,clay=False,colors=None):
    img=np.empty((h,w,3),np.uint8);img[:]=np.array([35,48,49],np.uint8); depth=np.full((h,w),-1e10)
    light=np.array([-.5,.85,.7]);light/=np.sqrt((light**2).sum())
    for face in faces:
        i,j,k=face; x0,y0,z0=screen[i];x1,y1,z1=screen[j];x2,y2,z2=screen[k]
        den=(y1-y2)*(x0-x2)+(x2-x1)*(y0-y2)
        if abs(den)<1e-10:continue
        for y in range(max(0,int(np.floor(min(y0,y1,y2)))),min(h,int(np.ceil(max(y0,y1,y2)))+1)):
            for x in range(max(0,int(np.floor(min(x0,x1,x2)))),min(w,int(np.ceil(max(x0,x1,x2)))+1)):
                a=((y1-y2)*(x+.5-x2)+(x2-x1)*(y+.5-y2))/den;b=((y2-y0)*(x+.5-x2)+(x0-x2)*(y+.5-y2))/den;c=1-a-b
                if min(a,b,c)<-1e-8:continue
                z=a*z0+b*z1+c*z2
                if z<=depth[y,x]:continue
                depth[y,x]=z
                nn=n[i]*a+n[j]*b+n[k]*c;nn/=max(1e-9,np.sqrt((nn**2).sum()))
                shade=max(0.,(nn*light).sum());t=uv[i]*a+uv[j]*b+uv[k]*c
                tx=min(atlas.shape[1]-1,max(0,int(t[0]*atlas.shape[1])));ty=min(atlas.shape[0]-1,max(0,int((1-t[1])*atlas.shape[0])))
                if clay:color=np.array([190.,196.,188.])*(.45+.55*shade)
                elif colors is not None:color=(colors[i]*a+colors[j]*b+colors[k]*c)*(.79+.21*shade)
                else:color=atlas[ty,tx].astype(np.float64)*(.79+.21*shade)
                for ch in range(3):img[y,x,ch]=min(255,max(0,int(color[ch])))
    return img

