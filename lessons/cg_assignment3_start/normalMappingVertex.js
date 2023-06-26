export default
`#version 300 es
  layout(location=0) in vec3 a_position; 
  layout(location=1) in vec2 a_texcoord;
  layout(location=2) in vec3 a_normal;
  layout(location=3) in vec3 a_tangent; // (Assign3) tangent 및 bitangent가 attribute로 넘어온다(이미 구현되어 있음)
  layout(location=4) in vec3 a_bitangent;

  uniform mat4 u_projection; 
  uniform mat4 u_view; //카메라를 통해 반환된 View행렬
  uniform mat4 u_model; //모델의 world공간 위치와 자세
  uniform mat4 u_directionalLightViewProjection; //light space transform matrix

  out vec2 v_texcoord;
  out vec3 v_normal; 
  out vec3 v_worldPosition; 
  out mat3 v_TBN;
  out vec4 v_lightSpacePos; //fragment의 light space 기준 좌표가 필요

  void main() {
    gl_Position = u_projection * u_view * u_model * vec4(a_position,1.0); 
    v_texcoord = a_texcoord;

    mat3 ivtr = transpose(inverse(mat3(u_model)));
    v_normal = normalize(ivtr * a_normal);
    vec3 tan = normalize(ivtr * a_tangent);
    vec3 bitan = normalize(ivtr * a_bitangent);

    v_worldPosition = (u_model * vec4(a_position, 1.0)).xyz; //정점의 World space 좌표
    
    //정점의 조명 공간 좌표. shadow 계산에 사용
    v_lightSpacePos = u_directionalLightViewProjection * u_model * vec4(a_position,1.0);

    // (Assign3) tangent 및 bitangent를 사용한 tangent space 변환 벡터 생성
	  v_TBN = transpose(mat3(tan, bitan, v_normal));
  }
`;