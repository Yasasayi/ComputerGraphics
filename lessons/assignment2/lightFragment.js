// [Assign2] 아래 shader는 WebGL lesson 17 & 18에서 구현한 dirLightFragment.js입니다.
// 이를 확장하여 하나의 directional light와 여러 개의 point light에 의한 색상이 계산이 가능하도록 shader를 구현해 보세요.

export default
`#version 300 es
  precision highp float;

  struct Light
  {
      vec3 lightColor;
      float ambientIntensity;
      float diffuseIntensity;
  };

  struct DirectionalLight
  {
    Light base;   
    vec3 direction;
  };

  // point light struct
  struct PointLight
  {
    Light base;
    vec3 position;
    float attenuationFactor;
  };

  struct Material
  {
    float specularIntensity;
    float shininess; // == sh
  };

  layout(location=0) out vec4 outColor;

  uniform sampler2D u_mainTexture;
  uniform DirectionalLight u_directionalLight; 
  uniform vec3 u_eyePosition; 
  uniform Material u_material;

  // point light uniforms
  uniform PointLight u_pointLights[3];

  in vec2 v_texcoord; 
  in vec3 v_normal; 
  in vec3 v_worldPosition; 

  vec3 CalculateLight(Light light, vec3 direction)
  {
      //normalize normal first
      vec3 normal = normalize(v_normal);
      
      //ambient
      vec3 lightAmbient = light.lightColor * light.ambientIntensity;
      
      //diffuse
      vec3 lightDir = normalize(-direction);
      float diffuseFactor = max(dot(normal, lightDir), 0.0);
      vec3 lightDiffuse = light.lightColor * light.diffuseIntensity * diffuseFactor;
      
      //specular
      vec3 vVec = normalize(u_eyePosition - v_worldPosition);
      vec3 rVec = 2.0 * normal * dot(normal, lightDir) - lightDir;
      vec3 lightSpecular = pow(max(dot(rVec,vVec),0.0),u_material.shininess) * light.lightColor * u_material.specularIntensity;
      
      return (lightAmbient + lightDiffuse + lightSpecular);
  }

  vec3 CalculateDirectionalLight()
  {
      return CalculateLight(u_directionalLight.base, u_directionalLight.direction);
  }

  // calculate point lights
  // direction vector = light's source - fragment
  vec3 CalculatePointLight(int i)
  {
      vec3 color = CalculateLight(u_pointLights[i].base, v_worldPosition - u_pointLights[i].position);
      float rSquare = (u_pointLights[i].position[0] - v_worldPosition[0]) * (u_pointLights[i].position[0] - v_worldPosition[0])  // r^2 = (x2-x1)^2 + (y2-y1)^2 + (z2-z1)^2
                    + (u_pointLights[i].position[1] - v_worldPosition[1]) * (u_pointLights[i].position[1] - v_worldPosition[1])
                    + (u_pointLights[i].position[2] - v_worldPosition[2]) * (u_pointLights[i].position[2] - v_worldPosition[2]);

      vec3 attenuatedColor = color / (u_pointLights[i].attenuationFactor * rSquare + 0.01);

      return attenuatedColor;
  }

  void main() {
    vec3 redLight = CalculatePointLight(0);
    vec3 greenLight = CalculatePointLight(1);
    vec3 blueLight = CalculatePointLight(2);
    vec3 lightColor = CalculateDirectionalLight() + redLight + blueLight + greenLight;

    outColor = texture(u_mainTexture, v_texcoord) * vec4(lightColor, 1.0);
  }
`;