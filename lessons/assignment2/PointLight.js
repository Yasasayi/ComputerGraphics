import {Light} from '../_classes/BasicLight.js'

export class PointLight extends Light {
    position;
    attenuationFactor;
    lightIndex;
  
    constructor(lightColor, aIntensity, dIntensity, position, attenuationFactor, lightIndex)
    {
      super(lightColor, aIntensity, dIntensity);
      this.position = position;
      this.attenuationFactor = attenuationFactor;
      this.lightIndex = lightIndex;
    }
  
    UseLight(gl,shader)
    {
      // [Assign2] (중요) 아래 uniform을 보고, 올바르게 동작하도록 lightFragment shader를 구현하세요.
      shader.SetUniform3f(gl,"u_pointLights[" + String(this.lightIndex) + "].base.lightColor", this.lightColor[0], this.lightColor[1], this.lightColor[2]);
      shader.SetUniform1f(gl,"u_pointLights[" + String(this.lightIndex) + "].base.ambientIntensity", this.ambientIntensity);
      shader.SetUniform1f(gl,"u_pointLights[" + String(this.lightIndex) + "].base.diffuseIntensity", this.diffuseIntensity);
  
      shader.SetUniform3f(gl,"u_pointLights[" + String(this.lightIndex) + "].position", this.position[0], this.position[1], this.position[2]);
      shader.SetUniform1f(gl,"u_pointLights[" + String(this.lightIndex) + "].attenuationFactor", this.attenuationFactor);
    }
  }